const PDFDocument = require('pdfkit');

class PDFService {
  /**
   * Consólida y agrupa las prescripciones por receta médica para evitar duplicaciones.
   * Si dos recetas tienen exactamente los mismos fármacos en la misma fecha, las consolida.
   */
  static groupAndConsolidatePrescriptions(prescriptions = []) {
    const grouped = [];
    const seenMap = new Map();

    prescriptions.forEach((rx) => {
      const items = rx.items || [];
      const medList = [];
      const instructionsList = [];

      if (items.length > 0) {
        items.forEach((it) => {
          const medName = String(it.medication_name || '').trim();
          const dosage = String(it.dosage || '').trim();
          if (medName) {
            medList.push(dosage ? `${medName} ${dosage}` : medName);
          }
          const freqParts = [it.frequency, it.duration, it.instructions].map((s) => String(s || '').trim()).filter(Boolean);
          if (freqParts.length > 0) {
            instructionsList.push(freqParts.join(' - '));
          }
        });
      }

      // Si no hay items en la tabla prescription_items pero hay un diagnóstico o texto
      if (medList.length === 0 && rx.diagnosis_text) {
        medList.push(rx.diagnosis_text.trim());
      }

      const medicationsStr = medList.length > 0 ? medList.join(', ') : 'Sin detalle farmacológico';
      const instructionsStr = instructionsList.length > 0 ? instructionsList.join('; ') : 'Según indicación médica';

      let rawDoctor = String(rx.doctor_name || '').trim();
      let doctorStr = '-';
      if (rawDoctor && !/^(no especificado|\(no especificado\)|no informado|desconocido|—|-)$/i.test(rawDoctor)) {
        doctorStr = rawDoctor;
      }

      const dateStr = rx.issue_date ? String(rx.issue_date).slice(0, 10) : '-';

      // Clave para consolidar recetas idénticas en la misma fecha
      const dedupeKey = `${dateStr}__${doctorStr}__${medicationsStr.toLowerCase()}`;
      if (seenMap.has(dedupeKey)) {
        return;
      }
      seenMap.set(dedupeKey, true);

      grouped.push({
        medications: medicationsStr,
        instructions: instructionsStr,
        doctor: doctorStr,
        date: dateStr,
      });
    });

    return grouped;
  }

  /**
   * Genera un buffer PDF con el informe clínico formal del paciente en formato A4.
   */
  static async generateClinicalReport({
    patient,
    profile = {},
    aiSummary = '',
    prescriptions = [],
    labReports = [],
    documents = [],
  }) {
    return new Promise((resolve, reject) => {
      try {
        // Formato A4: 595.28 x 841.89 pt
        const leftMargin = 40;
        const rightMargin = 40;
        const pageWidth = 595.28 - (leftMargin + rightMargin); // ~515.28 pt

        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 45, left: leftMargin, right: rightMargin },
          bufferPages: true,
          info: {
            Title: `Informe Clínico - ${patient?.first_name || ''} ${patient?.last_name || ''}`,
            Author: 'MyMedRecord - Salud Digital Interoperable',
            Subject: 'Informe Clínico Unificado (Ley 21.668 / Ley 21.719)',
            Creator: 'MyMedRecord Clinical Engine',
          },
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryColor = '#0f766e'; // Teal 700
        const darkColor = '#0f172a';    // Slate 900
        const grayColor = '#475569';    // Slate 600
        const lightBg = '#f8fafc';      // Slate 50
        const borderColor = '#cbd5e1';  // Slate 300
        const alertBg = '#f0fdfa';      // Teal 50

        // =====================================================================
        // 1. ENCABEZADO INSTITUCIONAL DE DOS COLUMNAS (SIN SUPERPOSICIÓN)
        // =====================================================================
        // Barra superior decorativa
        doc.rect(leftMargin, 38, pageWidth, 3.5).fill(primaryColor);

        const headerTopY = 48;
        const colWidthLeft = 210;
        const colRightX = leftMargin + 215;
        const colWidthRight = pageWidth - 215; // ~300 pt de ancho para fecha y ley sin riesgo de sobreposición

        // Lado Izquierdo: Logotipo y Subtítulo de marca
        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .fillColor(primaryColor)
          .text('MyMedRecord', leftMargin, headerTopY);

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(grayColor)
          .text('Plataforma de Salud Digital Interoperable', leftMargin, headerTopY + 22);

        // Lado Derecho: Metadatos de Emisión y Marco Legal (alineados a la derecha, en líneas separadas limpias)
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const emissionDate = `${pad(now.getDate())} de ${months[now.getMonth()]} de ${now.getFullYear()} · ${pad(now.getHours())}:${pad(now.getMinutes())} hrs`;

        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(darkColor)
          .text(`Fecha de Emisión: ${emissionDate}`, colRightX, headerTopY, {
            align: 'right',
            width: colWidthRight,
          });

        doc
          .font('Helvetica')
          .fontSize(6.8)
          .fillColor('#64748b')
          .text('República de Chile · Ley N° 21.668 y Ley N° 21.719', colRightX, headerTopY + 14, {
            align: 'right',
            width: colWidthRight,
          })
          .text('Tratamiento y Protección de Datos Personales de Salud', colRightX, headerTopY + 25, {
            align: 'right',
            width: colWidthRight,
          });

        // Línea divisoria horizontal limpia
        const dividerY = headerTopY + 44;
        doc.rect(leftMargin, dividerY, pageWidth, 0.75).fill(borderColor);

        // =====================================================================
        // 2. TÍTULO PRINCIPAL CENTRADO
        // =====================================================================
        const titleY = dividerY + 10;
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor(darkColor)
          .text('INFORME CLÍNICO UNIFICADO DEL PACIENTE', leftMargin, titleY, {
            align: 'center',
            width: pageWidth,
          });

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(grayColor)
          .text('Consolidado de Antecedentes, Prescripciones y Exámenes Diagnósticos', leftMargin, titleY + 18, {
            align: 'center',
            width: pageWidth,
          });

        // =====================================================================
        // 3. FICHA DE IDENTIFICACIÓN DEL PACIENTE
        // =====================================================================
        const startYPatient = titleY + 36;
        doc
          .rect(leftMargin, startYPatient, pageWidth, 74)
          .fillAndStroke(lightBg, borderColor);

        doc.fillColor(darkColor);

        // 3 columnas equilibradas
        const col1X = leftMargin + 12;
        const col2X = leftMargin + 185;
        const col3X = leftMargin + 350;
        const pRow1Y = startYPatient + 10;
        const pRow2Y = startYPatient + 30;
        const pRow3Y = startYPatient + 50;

        doc.font('Helvetica-Bold').fontSize(8.5).text('Paciente:', col1X, pRow1Y);
        doc.font('Helvetica').text(`${patient.first_name || ''} ${patient.last_name || ''}`, col1X + 48, pRow1Y);

        doc.font('Helvetica-Bold').text('RUT:', col1X, pRow2Y);
        doc.font('Helvetica').text(patient.rut || 'No informado', col1X + 48, pRow2Y);

        doc.font('Helvetica-Bold').text('Correo:', col1X, pRow3Y);
        doc.font('Helvetica').text(patient.email || '—', col1X + 48, pRow3Y);

        // Columna 2
        doc.font('Helvetica-Bold').text('Previsión:', col2X, pRow1Y);
        doc.font('Helvetica').text(profile.health_insurance || profile.healthInsurance || 'No declarada', col2X + 62, pRow1Y);

        doc.font('Helvetica-Bold').text('Grupo Sang.:', col2X, pRow2Y);
        doc.font('Helvetica').text(profile.blood_type || profile.bloodType || 'No registrado', col2X + 62, pRow2Y);

        doc.font('Helvetica-Bold').text('Donante:', col2X, pRow3Y);
        const donorText = profile.is_organ_donor === true || profile.isOrganDonor === true ? 'Sí' : (profile.is_organ_donor === false || profile.isOrganDonor === false ? 'No' : 'No declarado');
        doc.font('Helvetica').text(donorText, col2X + 62, pRow3Y);

        // Columna 3
        doc.font('Helvetica-Bold').text('Contacto Emergencia:', col3X, pRow1Y);
        doc.font('Helvetica').text(profile.emergency_contact_name || profile.emergencyContactName || 'No registrado', col3X, pRow1Y + 12);
        doc.font('Helvetica').text(profile.emergency_contact_phone || profile.emergencyContactPhone || '', col3X, pRow1Y + 24);

        // =====================================================================
        // 4. ANTECEDENTES Y COMORBILIDADES
        // =====================================================================
        const allergies = (profile.allergies || []).join(', ') || 'Ninguna alergia conocida declarada';
        const chronic = (profile.chronic_conditions || profile.chronicConditions || []).join(', ') || 'Sin antecedentes crónicos declarados';

        const startYAntecedentes = startYPatient + 84;
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(primaryColor)
          .text('ANTECEDENTES CLÍNICOS RELEVANTES', leftMargin, startYAntecedentes);

        const bgAntecedentes = startYAntecedentes + 14;
        doc.rect(leftMargin, bgAntecedentes, pageWidth, 36).fillAndStroke('#ffffff', borderColor);

        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkColor).text('Alergias:', leftMargin + 10, bgAntecedentes + 7);
        doc.font('Helvetica').fillColor(grayColor).text(allergies, leftMargin + 60, bgAntecedentes + 7, { width: pageWidth - 70 });

        doc.font('Helvetica-Bold').fillColor(darkColor).text('Condiciones:', leftMargin + 10, bgAntecedentes + 21);
        doc.font('Helvetica').fillColor(grayColor).text(chronic, leftMargin + 70, bgAntecedentes + 21, { width: pageWidth - 80 });

        // =====================================================================
        // 5. SÍNTESIS CLÍNICA NARRATIVA ASISTIDA POR IA (GEMINI)
        // =====================================================================
        const startYAi = bgAntecedentes + 44;
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(primaryColor)
          .text('SÍNTESIS CLÍNICA ASISTIDA POR INTELIGENCIA ARTIFICIAL (GEMINI)', leftMargin, startYAi);

        let aiBoxY = startYAi + 14;
        const aiText = aiSummary || 'No fue posible generar la síntesis automática en este momento.';

        doc.font('Helvetica').fontSize(8.5);
        const textOptions = {
          width: pageWidth - 24,
          align: 'justify',
          lineGap: 2,
        };
        const textHeight = doc.heightOfString(aiText, textOptions);
        const aiBoxHeight = Math.max(textHeight + 28, 54);

        // Si la caja de IA excede el límite imprimible de la página 1, se ubica limpia en la página 2
        if (aiBoxY + aiBoxHeight > 755) {
          doc.addPage();
          aiBoxY = 45;
          doc
            .font('Helvetica-Bold')
            .fontSize(9.5)
            .fillColor(primaryColor)
            .text('SÍNTESIS CLÍNICA ASISTIDA POR INTELIGENCIA ARTIFICIAL (GEMINI)', leftMargin, aiBoxY);
          aiBoxY += 14;
        }

        doc
          .rect(leftMargin, aiBoxY, pageWidth, aiBoxHeight)
          .fillAndStroke(alertBg, '#99f6e4');

        doc
          .font('Helvetica-Oblique')
          .fontSize(7.5)
          .fillColor('#0d9488')
          .text('✨ Análisis contextual generado automáticamente a partir de los documentos clínicos digitalizados.', leftMargin + 12, aiBoxY + 7);

        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(darkColor)
          .text(aiText, leftMargin + 12, aiBoxY + 20, textOptions);

        doc.y = aiBoxY + aiBoxHeight + 14;

        // =====================================================================
        // 6. TRATAMIENTOS FARMACOLÓGICOS (AGRUPADOS POR RECETA)
        // =====================================================================
        // Si queda poco espacio vertical (menos de 160pt), abrir una nueva página limpia
        if (doc.y > 580) {
          doc.addPage();
          doc.y = 45;
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(primaryColor)
          .text('TRATAMIENTOS FARMACOLÓGICOS (RECETAS MÉDICAS)', leftMargin, doc.y);

        doc.moveDown(0.3);

        // Proporciones A4 (pageWidth ~515pt):
        // Meds: 185pt | Indicaciones: 155pt | Médico: 88pt | Fecha: 68pt
        const colMedsW = 185;
        const colInstW = 155;
        const colDocW = 88;
        const colDateW = 68;

        const colMedsX = leftMargin + 8;
        const colInstX = leftMargin + 196;
        const colDocX = leftMargin + 354;
        const colDateX = leftMargin + 444;

        const drawPrescriptionHeader = (currentY) => {
          doc.rect(leftMargin, currentY, pageWidth, 20).fill('#e2e8f0');
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkColor);
          doc.text('MEDICAMENTO(S)', colMedsX, currentY + 6);
          doc.text('POSOLOGÍA / INDICACIÓN', colInstX, currentY + 6);
          doc.text('MÉDICO', colDocX, currentY + 6);
          doc.text('EMISIÓN', colDateX, currentY + 6, { align: 'right', width: colDateW - 4 });
          return currentY + 20;
        };

        let rowY = drawPrescriptionHeader(doc.y);

        const groupedMeds = this.groupAndConsolidatePrescriptions(prescriptions);

        if (groupedMeds.length === 0) {
          doc.rect(leftMargin, rowY, pageWidth, 20).fillAndStroke('#ffffff', borderColor);
          doc.font('Helvetica').fontSize(8.5).fillColor(grayColor).text('No hay recetas médicas registradas en el historial.', colMedsX, rowY + 6);
          rowY += 20;
        } else {
          groupedMeds.forEach((med, idx) => {
            doc.font('Helvetica').fontSize(8.5);
            const hMeds = doc.heightOfString(med.medications, { width: colMedsW - 10, lineGap: 1.5 });
            const hInst = doc.heightOfString(med.instructions, { width: colInstW - 10, lineGap: 1.5 });
            const dynamicRowHeight = Math.max(hMeds, hInst, 16) + 8;

            if (rowY + dynamicRowHeight > 755) {
              doc.addPage();
              rowY = drawPrescriptionHeader(45);
            }

            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(leftMargin, rowY, pageWidth, dynamicRowHeight).fillAndStroke(rowBg, borderColor);

            // Texto de medicamentos
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkColor).text(med.medications, colMedsX, rowY + 5, {
              width: colMedsW - 10,
              lineGap: 1.5,
            });

            // Indicaciones / Posología
            doc.font('Helvetica').fontSize(8).fillColor(grayColor).text(med.instructions, colInstX, rowY + 5, {
              width: colInstW - 10,
              lineGap: 1.5,
            });

            // Médico emisor (con guion si no está especificado)
            doc.font('Helvetica').fontSize(8).fillColor(darkColor).text(med.doctor, colDocX, rowY + 5, {
              width: colDocW - 6,
            });

            // Fecha
            doc.font('Helvetica').fontSize(8).fillColor(grayColor).text(med.date, colDateX, rowY + 5, {
              align: 'right',
              width: colDateW - 4,
            });

            rowY += dynamicRowHeight;
          });
        }

        doc.y = rowY + 16;

        // =====================================================================
        // 7. EXÁMENES DE LABORATORIO
        // =====================================================================
        // Si queda poco espacio para la tabla de exámenes (menos de 140pt), abrir nueva página
        if (doc.y > 600) {
          doc.addPage();
          doc.y = 45;
        }

        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor(primaryColor)
          .text('ESTUDIOS Y RESULTADOS PARACLÍNICOS', leftMargin, doc.y);

        doc.moveDown(0.3);

        const labColTestW = 172;
        const labColValW = 95;
        const labColRefW = 95;
        const labColDateW = 122;

        const labColTestX = leftMargin + 8;
        const labColValX = leftMargin + 185;
        const labColRefX = leftMargin + 285;
        const labColDateX = leftMargin + 385;

        const drawLabHeader = (currentY) => {
          doc.rect(leftMargin, currentY, pageWidth, 20).fill('#e2e8f0');
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(darkColor);
          doc.text('PRUEBA / ANÁLISIS', labColTestX, currentY + 6);
          doc.text('VALOR OBTENIDO', labColValX, currentY + 6);
          doc.text('RANGO REFERENCIA', labColRefX, currentY + 6);
          doc.text('ESTADO / FECHA', labColDateX, currentY + 6, { align: 'right', width: labColDateW - 6 });
          return currentY + 20;
        };

        let labRowY = drawLabHeader(doc.y);

        const allMetrics = [];
        labReports.forEach((report) => {
          const items = report.items || [];
          items.forEach((item) => {
            allMetrics.push({
              test: item.test_name,
              val: `${item.result_value} ${item.unit || ''}`.trim(),
              ref: item.reference_range || '—',
              abnormal: Boolean(item.is_abnormal),
              date: report.sample_date ? String(report.sample_date).slice(0, 10) : '-',
            });
          });
        });

        if (allMetrics.length === 0) {
          doc.rect(leftMargin, labRowY, pageWidth, 20).fillAndStroke('#ffffff', borderColor);
          doc.font('Helvetica').fontSize(8.5).fillColor(grayColor).text('No hay exámenes paraclínicos estructurados registrados.', labColTestX, labRowY + 6);
          labRowY += 20;
        } else {
          allMetrics.slice(0, 15).forEach((met, idx) => {
            if (labRowY + 20 > 755) {
              doc.addPage();
              labRowY = drawLabHeader(45);
            }
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
            doc.rect(leftMargin, labRowY, pageWidth, 20).fillAndStroke(rowBg, borderColor);

            doc.font('Helvetica').fontSize(8.5).fillColor(darkColor).text(met.test.slice(0, 32), labColTestX, labRowY + 5);
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor(met.abnormal ? '#b91c1c' : darkColor).text(met.val, labColValX, labRowY + 5);
            doc.font('Helvetica').fontSize(8).fillColor(grayColor).text(met.ref.slice(0, 20), labColRefX, labRowY + 5);

            const statusText = met.abnormal ? '⚠ Alterado' : 'Normal';
            doc.font('Helvetica').fontSize(8).fillColor(met.abnormal ? '#b91c1c' : '#047857').text(`${statusText} (${met.date})`, labColDateX, labRowY + 5, {
              align: 'right',
              width: labColDateW - 6,
            });

            labRowY += 20;
          });
        }

        // =====================================================================
        // 8. PIE DE PÁGINA Y DISCLAIMER LEGAL EN TODAS LAS PÁGINAS A4
        // =====================================================================
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);

          // Desactivar temporalmente el margen inferior para que PDFKit jamás dispare auto-paging fantasma
          const origBottomMargin = doc.page.margins.bottom;
          doc.page.margins.bottom = 0;

          const footerY = 792;
          doc.rect(leftMargin, footerY - 5, pageWidth, 0.5).fill(borderColor);

          doc
            .font('Helvetica-Oblique')
            .fontSize(6.5)
            .fillColor(grayColor)
            .text(
              'Aviso legal: Este informe consolida antecedentes médicos digitalizados voluntariamente por el paciente bajo la Ley N° 21.668 y Ley N° 21.719. ' +
              'La síntesis narrativa ha sido redactada con asistencia de IA generativa y no sustituye la evaluación médica presencial ni diagnósticos de especialistas.',
              leftMargin,
              footerY + 2,
              { width: pageWidth - 75, align: 'left', lineBreak: true }
            );

          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(darkColor)
            .text(`Página ${i + 1} de ${pages.count}`, leftMargin + pageWidth - 65, footerY + 3, {
              align: 'right',
              width: 65,
            });

          doc.page.margins.bottom = origBottomMargin;
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PDFService;
