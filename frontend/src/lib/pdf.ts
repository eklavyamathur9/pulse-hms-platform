import jsPDF from 'jspdf';

export function downloadPrescriptionPDF(rx: { id: number; issued_at: string; medication_details: string; digital_signature: string }, patientName: string) {
  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(30, 64, 175);
  doc.text("PULSE HOSPITAL", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Official E-Prescription Document", 105, 28, { align: "center" });

  doc.setLineWidth(0.5);
  doc.line(20, 35, 190, 35);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text("Patient Name:", 20, 50);
  doc.setFont("helvetica", "normal");
  doc.text(patientName, 60, 50);

  doc.setFont("helvetica", "bold");
  doc.text("Prescription ID:", 120, 50);
  doc.setFont("helvetica", "normal");
  doc.text(`#${rx.id}`, 160, 50);

  doc.setFont("helvetica", "bold");
  doc.text("Date Issued:", 20, 60);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(rx.issued_at).toLocaleDateString(), 60, 60);

  doc.setFont("helvetica", "bold");
  doc.text("Medication Details / Rx:", 20, 80);
  doc.setFont("courier", "normal");

  const splitText = doc.splitTextToSize(rx.medication_details, 170);
  doc.text(splitText, 20, 90);

  doc.line(20, 200, 190, 200);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Authorizing Signature:", 20, 210);

  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.text(rx.digital_signature, 20, 220);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("This document is cryptographically generated and legally binding by the Pulse Healthcare Network.", 105, 280, { align: "center" });

  doc.save(`Pulse_Rx_${rx.id}_${patientName.replace(/\s+/g, '_')}.pdf`);
}

export async function downloadDischargeSummary(apptId: number, _patientName: string, apiFetch: (url: string) => Promise<Response>, notify: { success: (msg: string) => void; error: (msg: string) => void }) {
  try {
    const res = await apiFetch(`/hospital/appointment/${apptId}/summary`);
    const data = await res.json() as {
      patient: { name: string; age: number; gender: string; blood_type: string };
      appointment: { id: number; date: string; symptoms: string; clinical_notes: string; followup: number };
      doctor: { name: string };
      vitals: { bp: string; hr: number; temp: number; weight: number };
      labs: Array<{ test_name: string; result: string }>;
      prescription: string;
    };

    const doc = new jsPDF();
    const margin = 20;
    let y = 20;

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('PULSE HOSPITAL', margin, y);

    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(100, 116, 139);
    doc.text('COMPREHENSIVE CLINICAL DISCHARGE SUMMARY', margin, y);

    y += 15;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, 190, y);

    y += 15;
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('PATIENT INFORMATION', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    doc.text(`Name: ${data.patient.name}`, margin, y);
    doc.text(`Age/Gender: ${data.patient.age} / ${data.patient.gender}`, margin + 80, y);
    y += 8;
    doc.text(`Blood Type: ${data.patient.blood_type}`, margin, y);
    doc.text(`Visit ID: #${data.appointment.id}`, margin + 80, y);
    y += 8;
    doc.text(`Date: ${data.appointment.date}`, margin, y);
    doc.text(`Consultant: Dr. ${data.doctor.name}`, margin + 80, y);

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('CLINICAL ASSESSMENT', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    doc.text('Symptoms:', margin, y);
    doc.setFontSize(10);
    doc.text(data.appointment.symptoms || 'None reported', margin + 5, y + 6);

    y += 15;
    doc.setFontSize(12);
    doc.text('Clinical Notes:', margin, y);
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(data.appointment.clinical_notes || 'No notes recorded.', 160);
    doc.text(splitNotes, margin + 5, y + 6);
    y += (splitNotes.length * 5) + 5;

    y += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VITAL SIGNS', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    doc.text(`BP: ${data.vitals.bp}`, margin, y);
    doc.text(`HR: ${data.vitals.hr} bpm`, margin + 45, y);
    doc.text(`Temp: ${data.vitals.temp}°F`, margin + 90, y);
    doc.text(`Weight: ${data.vitals.weight} kg`, margin + 135, y);

    if (data.labs.length > 0) {
      y += 15;
      doc.setFont('helvetica', 'bold');
      doc.text('LABORATORY INVESTIGATIONS', margin, y);
      doc.setFont('helvetica', 'normal');
      data.labs.forEach(lab => {
        y += 10;
        doc.text(`- ${lab.test_name}: ${lab.result || 'Pending'}`, margin + 5, y);
      });
    }

    y += 20;
    doc.setFont('helvetica', 'bold');
    doc.text('PRESCRIPTION & PLAN', margin, y);
    doc.setFont('helvetica', 'normal');
    y += 10;
    const splitRx = doc.splitTextToSize(data.prescription, 160);
    doc.text(splitRx, margin + 5, y);

    y += (splitRx.length * 5) + 10;
    doc.text(`Follow-up Recommended: within ${data.appointment.followup || 0} days`, margin, y);

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated medical summary from Pulse HMS.', margin, 280);
    doc.text(`Printed on: ${new Date().toLocaleString()}`, 130, 280);

    doc.save(`Summary_Visit_${apptId}.pdf`);
    notify.success('Discharge summary downloaded.');
  } catch (e) {
    notify.error('Failed to generate summary.');
  }
}

export function downloadInvoicePDF(inv: { id: number; date: string; doctor_name: string; consultation_fee: number; lab_charges: number; total: number }, patientName: string) {
  const doc = new jsPDF();
  doc.setFontSize(20); doc.setTextColor(37, 99, 235);
  doc.text('PULSE HOSPITAL', 105, 20, { align: 'center' });
  doc.setFontSize(12); doc.setTextColor(100, 100, 100);
  doc.text('Tax Invoice', 105, 28, { align: 'center' });
  doc.line(20, 35, 190, 35);
  doc.setTextColor(0, 0, 0); doc.setFontSize(11);
  doc.text(`Invoice #${inv.id}`, 20, 45);
  doc.text(`Date: ${inv.date}`, 20, 55);
  doc.text(`Doctor: ${inv.doctor_name}`, 20, 65);
  doc.text(`Patient: ${patientName}`, 20, 75);
  doc.line(20, 85, 190, 85);
  doc.text('Consultation Fee:', 20, 95);
  doc.text(`₹${inv.consultation_fee}`, 170, 95, { align: 'right' });
  doc.text('Lab Charges:', 20, 105);
  doc.text(`₹${inv.lab_charges}`, 170, 105, { align: 'right' });
  doc.line(20, 115, 190, 115);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text(`Total: ₹${inv.total}`, 170, 125, { align: 'right' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Paid - Thank you for choosing Pulse Hospital', 105, 280, { align: 'center' });
  doc.save(`Pulse_Invoice_${inv.id}.pdf`);
}
