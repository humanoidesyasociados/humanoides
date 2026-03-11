import type { APIRoute } from 'astro';
import * as dotenv from 'dotenv';
dotenv.config();
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { z } from 'zod';
import geoip from 'geoip-lite';

const leadSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Email inválido'),
  description: z.string().optional(),
  isPartial: z.boolean().optional(),
});

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const data = await request.json();
    
    // Validate payload
    const parsedData = leadSchema.parse(data);

    // Get IP address (Vercel uses x-forwarded-for, local uses clientAddress)
    const ip = request.headers.get('x-forwarded-for') || clientAddress || '127.0.0.1';
    
    // Lookup Country and City
    const geo = geoip.lookup(ip);
    const pais = geo ? geo.country : 'Desconocido';
    const ciudad = geo ? geo.city : 'Desconocida';
    const ubicacion = `${ciudad}, ${pais}`.replace(/^, /, ''); // Clean up trailing comma if city is unknown

    // Format Date and Time for Barcelona (Europe/Madrid timezone)
    const now = new Date();
    const formatterDate = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formatterTime = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const fechaEnvio = formatterDate.format(now);
    const horaEnvio = formatterTime.format(now);

    // Initialize Google Auth
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!, serviceAccountAuth);

    // Load document properties and worksheets
    await doc.loadInfo(); 
    
    // Assuming the first sheet is the one we want to write to
    const sheet = doc.sheetsByIndex[0]; 

    // Get all rows to check for existing email
    const rows = await sheet.getRows();
    const existingRow = rows.find(row => row.get('Email') === parsedData.email);

    if (existingRow) {
      // Update existing row
      existingRow.set('Nombre', parsedData.name || existingRow.get('Nombre') || (parsedData.isPartial ? '(Borrador Incompleto)' : '(Sin Nombre)'));
      existingRow.set('Descripción', parsedData.description || existingRow.get('Descripción') || '(Sin Descripción)');
      existingRow.set('Fecha', fechaEnvio);
      existingRow.set('Hora', horaEnvio);
      existingRow.set('IP', ip);
      existingRow.set('Ubicación', ubicacion);
      await existingRow.save();
    } else {
      // Append standard row
      await sheet.addRow({
        Nombre: parsedData.name || (parsedData.isPartial ? '(Borrador Incompleto)' : '(Sin Nombre)'),
        Email: parsedData.email,
        Descripción: parsedData.description || '(Sin Descripción)',
        Fecha: fechaEnvio,
        Hora: horaEnvio,
        IP: ip,
        Ubicación: ubicacion
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error saving lead:', error);
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

