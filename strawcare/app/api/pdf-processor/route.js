import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Patient from '@/models/Patient';
import connectDB from '@/lib/db';

export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const patient = await Patient.findOne({ userId });
    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const formData = await request.formData();
    console.log('FormData entries:', [...formData.entries()]);

    // Get files from form data
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      console.log('No files found in formData');
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    console.log(`Processing ${files.length} PDF files...`);

    // Create FormData for AI API with ALL files at once
    const aiFormData = new FormData();
    
    for (const file of files) {
      if (!file || !file.name) {
        console.log('Invalid file:', file);
        continue;
      }

      console.log(`Adding file to batch: ${file.name}, size: ${file.size}`);
      
      // Convert file to buffer for AI API
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const blob = new Blob([buffer], { type: 'application/pdf' });
      
      // Add each file to the same FormData with 'files' key
      aiFormData.append('files', blob, file.name);
    }

    console.log('Calling AI API for combined PDF parsing...');

    // Send ALL files in ONE request to FastAPI
    const response = await fetch(process.env.AI_PDF, {
      method: 'POST',
      body: aiFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI API error:`, response.status, errorText);
      return NextResponse.json(
        { error: `AI API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const jsonResult = await response.json();
    console.log(`Successfully processed ${files.length} files into combined report`);

    // Save combined data to patient's lab_json field
    const labData = {
      parsed_json: jsonResult.parsed_json || [],
      pdf_download_url: jsonResult.pdf_download_url || null,
      processed_at: new Date().toISOString(),
      total_files_processed: jsonResult.total_files_processed || files.length,
      total_reports_merged: jsonResult.total_reports_merged || 0,
      unique_tests_found: jsonResult.unique_tests_found || 0
    };

    // Update patient record
    patient.lab_json = JSON.stringify(labData);
    await patient.save();

    console.log(`Successfully processed and saved combined data for patient ${userId}`);
    console.log(jsonResult)

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${files.length} PDF files into combined report`,
      parsed_json: jsonResult.parsed_json,
      pdf_download_urls: jsonResult.pdf_download_url ? [
        {
            filename: files.length > 1 ? 'Combined Medical Report.pdf' : files[0].name.replace('.pdf', '_processed.pdf'),
            download_url: jsonResult.pdf_download_url
        }
    ] : [],
      total_files_processed: jsonResult.total_files_processed,
      total_reports_merged: jsonResult.total_reports_merged,
      unique_tests_found: jsonResult.unique_tests_found
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF files: ' + error.message },
      { status: 500 }
    );
  }
}
