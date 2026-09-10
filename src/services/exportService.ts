import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  Header, 
  Footer, 
  AlignmentType,
  BorderStyle,
  PageNumber
} from 'docx';
import { saveAs } from 'file-saver';
import { ProjectDocument, DocumentBrandingTemplate, Task, TeamMember } from '../types';
import { DOCUMENT_TEMPLATES } from '../constants/documentTemplates';

export const exportService = {
  async exportToDocx(
    doc: ProjectDocument,
    branding?: DocumentBrandingTemplate,
    orgName?: string,
    tasks?: Task[]
  ): Promise<void> {
    try {
      const template = DOCUMENT_TEMPLATES.find((t) => t.id === doc.templateId) || DOCUMENT_TEMPLATES[1];
      const sections: any[] = [];
      const companyHeader = branding?.header?.leftText || orgName || 'Project Management Office';
      const orgFooter = branding?.footer?.copyrightText || 'UNAI TECH PVT LTD';
      const confidentiality = branding?.footer?.confidentialityNotice || 'Confidential';

      // ── Document Title Banner ──
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: doc.name.toUpperCase(),
              bold: true,
              size: 32, // 16pt
              color: '152E75', // Dark Navy / Brand Blue
            }),
          ],
          spacing: { before: 100, after: 180 },
        })
      );

      // ── Section: DOCUMENT CONTROL ──
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'DOCUMENT CONTROL',
              bold: true,
              size: 22,
              color: '0F172A',
            }),
          ],
          spacing: { before: 180, after: 100 },
        })
      );

      // Table 1: Revision Matrix (6 columns)
      const docControlRows: TableRow[] = [
        new TableRow({
          tableHeader: true,
          children: [
            new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Version', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 12, type: WidthType.PERCENTAGE } }),
            new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Date', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 14, type: WidthType.PERCENTAGE } }),
            new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Prepared By', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 18, type: WidthType.PERCENTAGE } }),
            new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Reviewed By', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 18, type: WidthType.PERCENTAGE } }),
            new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Approved By', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 18, type: WidthType.PERCENTAGE } }),
            new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Description of Changes', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
          ],
        }),
      ];

      if (doc.history && doc.history.length > 0) {
        doc.history.forEach((h) => {
          docControlRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: `v${h.version}` })] }),
                new TableCell({ children: [new Paragraph({ text: h.date })] }),
                new TableCell({ children: [new Paragraph({ text: h.author || doc.ownerName })] }),
                new TableCell({ children: [new Paragraph({ text: 'Tech Lead / PM' })] }),
                new TableCell({ children: [new Paragraph({ text: doc.status === 'Approved' ? 'Kamalesh S (CTO)' : 'Pending' })] }),
                new TableCell({ children: [new Paragraph({ text: h.summary || 'Baseline governance update' })] }),
              ],
            })
          );
        });
      } else {
        docControlRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ text: `v${doc.version || '1.0'}` })] }),
              new TableCell({ children: [new Paragraph({ text: doc.lastUpdated || doc.createdAt || new Date().toLocaleDateString('en-GB') })] }),
              new TableCell({ children: [new Paragraph({ text: doc.ownerName || 'Kamalesh S (CTO)' })] }),
              new TableCell({ children: [new Paragraph({ text: 'Tech Lead' })] }),
              new TableCell({ children: [new Paragraph({ text: doc.status === 'Approved' ? 'Kamalesh S (CTO)' : 'Pending' })] }),
              new TableCell({ children: [new Paragraph({ text: 'Initial baseline creation & sign-off' })] }),
            ],
          })
        );
      }

      sections.push(new Table({ rows: docControlRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      sections.push(new Paragraph({ text: '', spacing: { after: 180 } }));

      // ── Table 2: PROJECT METADATA Block ──
      const metadataTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Project Name: ', bold: true, size: 20 }), new TextRun({ text: doc.projectName, size: 20 })] })],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Document Version: ', bold: true, size: 20 }), new TextRun({ text: `v${doc.version}`, size: 20 })] })],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Prepared By: ', bold: true, size: 20 }), new TextRun({ text: doc.ownerName, size: 20 })] })],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'Date: ', bold: true, size: 20 }), new TextRun({ text: doc.createdAt || new Date().toLocaleDateString('en-GB'), size: 20 })] })],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
      });

      sections.push(metadataTable);
      sections.push(new Paragraph({ text: '', spacing: { after: 240 } }));

      // ── Render Template Sections & Custom Data Tables ──
      const content = doc.content || {};

      template.sections.forEach((sec) => {
        if (sec.id === 'approvals') return; // Rendered at the end

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sec.title.toUpperCase(),
                bold: true,
                size: 22,
                color: '1E3A8A',
              }),
            ],
            spacing: { before: 240, after: 120 },
          })
        );

        sec.fields.forEach((field) => {
          const val = content[field.id];

          if (field.type === 'table') {
            const tableRowsData: Record<string, any>[] = Array.isArray(val) && val.length > 0 ? val : [];
            const cols = field.columns || [{ id: 'col1', label: 'Item' }];

            const headerRow = new TableRow({
              tableHeader: true,
              children: cols.map((col) => (
                new TableCell({
                  shading: { fill: '1B365D' },
                  children: [new Paragraph({ children: [new TextRun({ text: col.label, bold: true, size: 18, color: 'FFFFFF' })] })],
                  width: { size: Math.floor(100 / cols.length), type: WidthType.PERCENTAGE },
                })
              )),
            });

            const tableRows: TableRow[] = [headerRow];

            if (tableRowsData.length > 0) {
              tableRowsData.forEach((row) => {
                const rowCells = cols.map((col) => {
                  let cellVal = row[col.id];
                  if (cellVal === undefined || cellVal === null) {
                    // Try camelCase fallback (e.g. targetDate vs target_date)
                    const camelKey = col.id.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    cellVal = row[camelKey];
                  }
                  if (cellVal === undefined || cellVal === null) {
                    // Common fallback aliases
                    const aliases: Record<string, string[]> = {
                      task_name: ['deliverable', 'task', 'feature_name', 'name', 'activity'],
                      deliverable: ['task_name', 'task', 'feature', 'milestone', 'name'],
                      milestone: ['deliverable', 'phase', 'name'],
                      owner: ['assignee', 'lead', 'name', 'responsible_person', 'subtask_assignee', 'verified_by'],
                      target_date: ['targetDate', 'end_date', 'dueDate', 'date'],
                      start_date: ['startDate', 'start'],
                      end_date: ['endDate', 'end', 'target_date'],
                      description: ['notes', 'justification', 'remarks', 'specification', 'requirement'],
                      priority: ['severity', 'impact'],
                      status: ['state', 'result'],
                      user_story: ['story', 'requirement', 'description'],
                      story_points: ['points', 'estimate'],
                    };
                    const aliasList = aliases[col.id] || [];
                    for (const a of aliasList) {
                      if (row[a] !== undefined && row[a] !== null && String(row[a]).trim() !== '') {
                        cellVal = row[a];
                        break;
                      }
                    }
                  }

                  const cellText = cellVal !== undefined && cellVal !== null ? String(cellVal) : '';
                  return new TableCell({
                    children: [new Paragraph({ text: cellText || '—' })],
                    width: { size: Math.floor(100 / cols.length), type: WidthType.PERCENTAGE },
                  });
                });
                tableRows.push(new TableRow({ children: rowCells }));
              });
            } else {
              const blankCells = cols.map(() => (
                new TableCell({
                  children: [new Paragraph({ text: '—' })],
                  width: { size: Math.floor(100 / cols.length), type: WidthType.PERCENTAGE },
                })
              ));
              tableRows.push(new TableRow({ children: blankCells }));
            }

            sections.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
            sections.push(new Paragraph({ text: '', spacing: { after: 120 } }));
          } else {
            if (val !== undefined && String(val).trim() !== '') {
              const valStr = String(val);
              if (valStr.includes('\n')) {
                sections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${field.label}:`,
                        bold: true,
                        size: 20,
                        color: '0F172A',
                      }),
                    ],
                    spacing: { before: 80, after: 40 },
                  })
                );
                valStr.split(/\r?\n/).forEach((line) => {
                  if (line.trim()) {
                    sections.push(
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: line.trim(),
                            size: 19,
                            color: '334155',
                          }),
                        ],
                        indent: { left: 360 },
                        spacing: { after: 40 },
                      })
                    );
                  }
                });
              } else {
                sections.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${field.label}: `,
                        bold: true,
                        size: 20,
                        color: '0F172A',
                      }),
                      new TextRun({
                        text: valStr,
                        size: 20,
                      }),
                    ],
                    spacing: { after: 100 },
                  })
                );
              }
            }
          }
        });
      });

      // ── Task Deliverables & Team Contributions Table ──
      if (tasks && tasks.length > 0) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'TEAM CONTRIBUTIONS & VERIFIED TASK DELIVERABLES',
                bold: true,
                size: 22,
                color: '1E3A8A',
              }),
            ],
            spacing: { before: 240, after: 120 },
          })
        );

        const taskRows = [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Task / Objective', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
              new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Contributor (Role)', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 25, type: WidthType.PERCENTAGE } }),
              new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
              new TableCell({ shading: { fill: '1B365D' }, children: [new Paragraph({ children: [new TextRun({ text: 'Deliverable Notes / Files', bold: true, size: 18, color: 'FFFFFF' })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
            ],
          }),
        ];

        tasks.forEach((t: any) => {
          taskRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: t.title })] }),
                new TableCell({ children: [new Paragraph({ text: `${t.assignedToName} (${t.assignedToRole})` })] }),
                new TableCell({ children: [new Paragraph({ text: t.status })] }),
                new TableCell({
                  children: [
                    new Paragraph({ text: t.submission?.notes || 'Task in progress' }),
                    ...(t.submission?.fileUrls ? [new Paragraph({ text: `Files: ${t.submission.fileUrls.join(', ')}` })] : []),
                  ],
                }),
              ],
            })
          );
        });

        sections.push(new Table({ rows: taskRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
        sections.push(new Paragraph({ text: '', spacing: { after: 180 } }));
      }

      // ── APPROVAL / SIGN-OFF 2-Column Signature Table ──
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'APPROVAL & EXECUTIVE SIGN-OFF',
              bold: true,
              size: 22,
              color: '1E3A8A',
            }),
          ],
          spacing: { before: 240, after: 120 },
        })
      );

      const approvalStatus = content.cto_approval || (doc.status === 'Approved' ? 'Approved' : 'Pending Review');
      const approvalDate = content.approval_date || doc.lastUpdated || new Date().toLocaleDateString('en-GB');

      const approvalTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'Primary Author / Sponsor', bold: true, size: 20 })] }),
                  new Paragraph({ children: [new TextRun({ text: `Name: ${doc.ownerName}`, size: 18 })] }),
                  new Paragraph({ children: [new TextRun({ text: `Date: ${doc.createdAt || approvalDate}`, size: 18 })] }),
                  new Paragraph({ children: [new TextRun({ text: 'Signature / Status: Certified', size: 18, color: '059669' })] }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
              new TableCell({
                children: [
                  new Paragraph({ children: [new TextRun({ text: 'CTO / Executive Sign-off', bold: true, size: 20 })] }),
                  new Paragraph({ children: [new TextRun({ text: 'Name: Kamalesh S (CTO)', size: 18 })] }),
                  new Paragraph({ children: [new TextRun({ text: `Date: ${approvalDate}`, size: 18 })] }),
                  new Paragraph({ children: [new TextRun({ text: `Status: ${approvalStatus}`, size: 18, bold: true, color: approvalStatus === 'Approved' ? '059669' : 'D97706' })] }),
                  ...(content.approval_notes ? [new Paragraph({ children: [new TextRun({ text: `Remarks: ${content.approval_notes}`, size: 16, italics: true })] })] : []),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
              }),
            ],
          }),
        ],
      });

      sections.push(approvalTable);

      // ── Word Document Instance with Header & Footer ──
      const wordDoc = new Document({
        sections: [
          {
            headers: {
              default: new Header({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: companyHeader, bold: true, size: 18, color: '64748B' }),
                    ],
                    alignment: AlignmentType.RIGHT,
                    spacing: { after: 120 },
                  }),
                ],
              }),
            },
            footers: {
              default: new Footer({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${orgFooter}  •  ${confidentiality}  •  Page `, size: 16, color: '94A3B8' }),
                      new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '94A3B8' }),
                      new TextRun({ text: ' of ', size: 16, color: '94A3B8' }),
                      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '94A3B8' }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 120 },
                  }),
                ],
              }),
            },
            properties: {
              page: {
                margin: {
                  top: 1440, // 1 inch
                  bottom: 1440,
                  left: 1440,
                  right: 1440,
                },
              },
            },
            children: sections,
          },
        ],
      });

      const blob = await Packer.toBlob(wordDoc);
      const cleanFileName = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
      saveAs(blob, `${cleanFileName}_v${doc.version}.docx`);

      // Record export in document_exports (§45)
      try {
        const { supabaseClient } = await import('../lib/supabaseClient');
        await supabaseClient.from('document_exports').insert({
          id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          project_id: doc.projectId,
          document_id: doc.id,
          version_id: null,
          export_type: 'DOCX',
          file_path: `${cleanFileName}_v${doc.version}.docx`,
          generated_at: new Date().toISOString(),
          organization_id: (doc as any).organizationId || (doc as any).organization_id || 'org-unai',
          metadata: { docName: doc.name, version: doc.version },
        });
      } catch (expErr) {
        console.warn('Non-fatal: document export logging notice:', expErr);
      }
    } catch (err) {
      console.error('Failed to export DOCX:', err);
      throw new Error('Error during document generation. Please try again.');
    }
  },

  async exportToPdf(
    doc: ProjectDocument,
    branding?: DocumentBrandingTemplate,
    orgName?: string,
    logoUrl?: string,
    tasks?: Task[]
  ): Promise<void> {
    const template = DOCUMENT_TEMPLATES.find((t) => t.id === doc.templateId) || DOCUMENT_TEMPLATES[1];
    const content = doc.content || {};

    const wmEnabled = branding?.watermark?.enabled ?? true;
    const wmType = branding?.watermark?.type || 'custom';
    const wmCustomType = branding?.watermark?.customType || 'text';
    const wmText = branding?.watermark?.text || 'CONFIDENTIAL';
    const wmCustomImg = branding?.watermark?.customImageUrl;
    const wmOpacity = ((branding?.watermark?.opacity ?? 12) / 100).toFixed(2);
    const wmOrientation = branding?.watermark?.orientation === 'horizontal' ? '0deg' : '-30deg';
    const wmSize = branding?.watermark?.size || 'md';

    let fontSize = '64px';
    let imgMaxWidth = '300px';
    if (wmSize === 'sm') {
      fontSize = '44px';
      imgMaxWidth = '200px';
    } else if (wmSize === 'lg') {
      fontSize = '80px';
      imgMaxWidth = '400px';
    } else if (wmSize === 'xl') {
      fontSize = '96px';
      imgMaxWidth = '500px';
    }

    let watermarkInner = '';
    if ((wmType === 'logo' && logoUrl) || (wmType === 'custom' && wmCustomType === 'image' && (wmCustomImg || logoUrl))) {
      const activeLogo = (wmType === 'custom' && wmCustomImg) ? wmCustomImg : logoUrl;
      watermarkInner = `<img src="${activeLogo}" alt="Watermark" style="max-width: ${imgMaxWidth}; max-height: 300px; object-fit: contain; transform: rotate(${wmOrientation});" />`;
    } else {
      watermarkInner = `
        <span style="font-size: ${fontSize}; font-weight: 900; font-family: 'Arial Black', Impact, sans-serif; color: #64748b; transform: rotate(${wmOrientation}); text-transform: uppercase; letter-spacing: 8px; text-align: center; max-width: 90%;">
          ${wmText}
        </span>
      `;
    }

    let watermarkHtml = '';
    if (wmEnabled) {
      watermarkHtml = `
        <div class="watermark-layer" style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; z-index: 0; opacity: ${wmOpacity};">
          ${watermarkInner}
        </div>
      `;
    }

    const headerEnabled = branding?.header?.enabled ?? true;
    const showLogo = (branding?.header?.showLogo ?? true) && !!logoUrl;
    const headerAlignment = branding?.header?.alignment || 'split';
    const headerLayout = branding?.header?.layout || 'inline';
    const isBold = branding?.header?.isBold ?? true;
    const headerLeftText = branding?.header?.leftText || orgName || 'Project Management Office';
    const headerRightText = branding?.header?.rightText || 'PM CRM Engineering Deliverable';

    let headerHtml = '';
    if (headerEnabled) {
      if (headerAlignment === 'split') {
        headerHtml = `
          <div class="header-layer" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${showLogo ? `<img src="${logoUrl}" alt="Logo" style="height: 24px; max-width: 80px; object-fit: contain;" />` : ''}
              <span style="font-size: 11px; color: #334155; font-weight: ${isBold ? 'bold' : 'normal'};">${headerLeftText}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; font-weight: ${isBold ? '600' : 'normal'};">
              ${headerRightText}
            </div>
          </div>
        `;
      } else if (headerAlignment === 'center') {
        headerHtml = `
          <div class="header-layer" style="display: flex; flex-direction: ${headerLayout === 'stacked' ? 'column' : 'row'}; justify-content: center; align-items: center; gap: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px;">
            ${showLogo ? `<img src="${logoUrl}" alt="Logo" style="height: 24px; max-width: 80px; object-fit: contain;" />` : ''}
            <span style="font-size: 11px; color: #334155; font-weight: ${isBold ? 'bold' : 'normal'}; text-align: center;">${headerLeftText}</span>
            ${headerRightText ? `<span style="font-size: 10px; color: #64748b;">• ${headerRightText}</span>` : ''}
          </div>
        `;
      } else if (headerAlignment === 'left') {
        headerHtml = `
          <div class="header-layer" style="display: flex; flex-direction: ${headerLayout === 'stacked' ? 'column' : 'row'}; align-items: flex-start; gap: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px;">
            ${showLogo ? `<img src="${logoUrl}" alt="Logo" style="height: 24px; max-width: 80px; object-fit: contain;" />` : ''}
            <span style="font-size: 11px; color: #334155; font-weight: ${isBold ? 'bold' : 'normal'};">${headerLeftText}</span>
          </div>
        `;
      } else {
        headerHtml = `
          <div class="header-layer" style="display: flex; justify-content: flex-end; align-items: center; gap: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 16px;">
            <span style="font-size: 11px; color: #334155; font-weight: ${isBold ? 'bold' : 'normal'};">${headerLeftText}</span>
            ${showLogo ? `<img src="${logoUrl}" alt="Logo" style="height: 24px; max-width: 80px; object-fit: contain;" />` : ''}
          </div>
        `;
      }
    }

    const footerEnabled = branding?.footer?.enabled ?? true;
    const footerCopyright = branding?.footer?.copyrightText || 'UNAI TECH PVT LTD';
    const footerConfidentiality = branding?.footer?.confidentialityNotice || 'Strictly Confidential';
    const showPageNumber = branding?.footer?.showPageNumber ?? true;

    let footerHtml = '';
    if (footerEnabled) {
      footerHtml = `
        <div class="footer-layer" style="border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 9px; color: #64748b; margin-top: 32px;">
          <div>${footerCopyright}  •  ${footerConfidentiality}</div>
          ${showPageNumber ? '<div>Page 1 of 1</div>' : '<div></div>'}
        </div>
      `;
    }

    let bodyContentHtml = `
      <!-- Document Title -->
      <div style="margin-bottom: 24px; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px;">
        <h1 style="font-size: 20px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">
          ${doc.name}
        </h1>
        <div style="font-size: 11px; color: #475569;">
          Phase: <strong>${doc.phase}</strong> | Status: <strong style="color: ${doc.status === 'Approved' ? '#059669' : '#2563eb'};">${doc.status}</strong>
        </div>
      </div>

      <!-- Table 1: DOCUMENT CONTROL -->
      <div style="margin-bottom: 20px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">DOCUMENT CONTROL</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <thead>
            <tr style="background-color: #1b365d; color: #ffffff;">
              <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Version</th>
              <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Date</th>
              <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Prepared By</th>
              <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Reviewed By</th>
              <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Approved By</th>
              <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Description of Changes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: bold;">v${doc.version}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${doc.lastUpdated || doc.createdAt}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${doc.ownerName}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">Tech Lead / PM</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${doc.status === 'Approved' ? 'Kamalesh S (CTO)' : 'Pending'}</td>
              <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">Baseline governance update</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table 2: PROJECT METADATA -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 11px;">
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; width: 50%;">Project Name: <span style="font-weight: normal;">${doc.projectName}</span></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold; width: 50%;">Document Version: <span style="font-weight: normal;">v${doc.version}</span></td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold;">Prepared By: <span style="font-weight: normal;">${doc.ownerName}</span></td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 10px; font-weight: bold;">Date: <span style="font-weight: normal;">${doc.createdAt}</span></td>
          </tr>
        </tbody>
      </table>
    `;

    // Render template sections
    template.sections.forEach((sec) => {
      if (sec.id === 'approvals') return;

      bodyContentHtml += `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 12px; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase;">
            ${sec.title}
          </h3>
      `;

      sec.fields.forEach((field) => {
        const val = content[field.id];

        if (field.type === 'table') {
          const tableRowsData: Record<string, any>[] = Array.isArray(val) && val.length > 0 ? val : [];
          const cols = field.columns || [{ id: 'col1', label: 'Item' }];

          bodyContentHtml += `
            <div style="margin-bottom: 12px;">
              <div style="font-size: 10px; font-weight: bold; color: #475569; margin-bottom: 4px; text-transform: uppercase;">${field.label}</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                <thead>
                  <tr style="background-color: #1b365d; color: #ffffff;">
                    ${cols.map((c) => `<th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">${c.label}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${tableRowsData.length > 0 ? tableRowsData.map((row) => `
                    <tr>
                      ${cols.map((c) => `<td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${row[c.id] || '—'}</td>`).join('')}
                    </tr>
                  `).join('') : `
                    <tr>
                      ${cols.map(() => `<td style="border: 1px solid #cbd5e1; padding: 5px 8px; color: #94a3b8;">—</td>`).join('')}
                    </tr>
                  `}
                </tbody>
              </table>
            </div>
          `;
        } else {
          if (val !== undefined && String(val).trim() !== '') {
            const valStr = String(val);
            const isMultiLine = valStr.includes('\n');
            bodyContentHtml += `
              <div style="margin-bottom: 10px; font-size: 11px;">
                <div style="font-weight: bold; color: #1e293b; margin-bottom: 2px;">${field.label}:</div>
                <div style="color: #334155; margin-left: ${isMultiLine ? '8px' : '0'}; white-space: pre-wrap; line-height: 1.6;">${valStr}</div>
              </div>
            `;
          }
        }
      });

      bodyContentHtml += `</div>`;
    });

    // Task Deliverables Table
    if (tasks && tasks.length > 0) {
      bodyContentHtml += `
        <div style="margin-top: 24px; page-break-inside: avoid;">
          <h3 style="font-size: 12px; font-weight: 800; color: #1e3a8a; margin-bottom: 8px; text-transform: uppercase;">
            TEAM CONTRIBUTIONS & VERIFIED TASK DELIVERABLES
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background-color: #1b365d; color: #ffffff;">
                <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Task / Objective</th>
                <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Contributor (Role)</th>
                <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Status</th>
                <th style="border: 1px solid #1b365d; padding: 6px 8px; text-align: left; color: #ffffff; font-weight: bold;">Deliverable Notes / Files</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map((t) => `
                <tr>
                  <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: bold;">${t.title}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${t.assignedToName} (${t.assignedToRole})</td>
                  <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: bold; color: ${t.status === 'Verified' ? '#059669' : '#d97706'};">${t.status}</td>
                  <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${t.submission?.notes || 'Task in progress'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Sign-off / Verification Block
    const approvalStatus = content.cto_approval || (doc.status === 'Approved' ? 'Approved' : 'Pending Review');
    const approvalDate = content.approval_date || doc.lastUpdated || new Date().toLocaleDateString('en-GB');

    bodyContentHtml += `
      <div style="margin-top: 24px; page-break-inside: avoid;">
        <h3 style="font-size: 12px; font-weight: 800; color: #1e3a8a; margin-bottom: 8px; text-transform: uppercase;">
          APPROVAL & EXECUTIVE SIGN-OFF
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px 12px; width: 50%; vertical-align: top;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">Primary Author / Sponsor</div>
                <div>Name: <strong>${doc.ownerName}</strong></div>
                <div>Date: ${doc.createdAt || approvalDate}</div>
                <div style="color: #059669; font-weight: bold; margin-top: 4px;">✓ Certified Baseline</div>
              </td>
              <td style="border: 1px solid #cbd5e1; padding: 8px 12px; width: 50%; vertical-align: top;">
                <div style="font-weight: bold; font-size: 11px; margin-bottom: 4px;">CTO / Executive Sign-off</div>
                <div>Name: <strong>Kamalesh S (CTO)</strong></div>
                <div>Date: ${approvalDate}</div>
                <div style="color: ${approvalStatus === 'Approved' ? '#059669' : '#d97706'}; font-weight: bold; margin-top: 4px;">Status: ${approvalStatus}</div>
                ${content.approval_notes ? `<div style="font-style: italic; color: #475569; margin-top: 2px;">Remarks: ${content.approval_notes}</div>` : ''}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.name} - ${headerLeftText}</title>
        <meta charset="utf-8" />
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm 15mm 18mm 15mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
          }
          .page-container {
            position: relative;
            min-height: 95vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header-layer {
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 6px;
            margin-bottom: 16px;
          }
          .footer-layer {
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9px;
            color: #64748b;
            margin-top: 32px;
          }
        </style>
      </head>
      <body>
        ${watermarkHtml}
        <div class="page-container">
          <div>
            ${headerHtml}
            ${bodyContentHtml}
          </div>
          ${footerHtml}
        </div>
      </body>
      </html>
    `;

    let iframe = document.getElementById('pm-document-print-frame') as HTMLIFrameElement | null;
    if (iframe) {
      document.body.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = 'pm-document-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    iframeDoc.open();
    iframeDoc.write(printHtml);
    iframeDoc.close();

    setTimeout(() => {
      try {
        iframe?.contentWindow?.focus();
        iframe?.contentWindow?.print();
      } catch (e) {
        console.error('Print iframe error:', e);
      }
    }, 300);

    // Record export in document_exports (§45)
    try {
      const { supabaseClient } = await import('../lib/supabaseClient');
      await supabaseClient.from('document_exports').insert({
        id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        project_id: doc.projectId,
        document_id: doc.id,
        version_id: null,
        export_type: 'PDF',
        generated_at: new Date().toISOString(),
        organization_id: (doc as any).organizationId || (doc as any).organization_id || 'org-unai',
        metadata: { docName: doc.name, version: doc.version },
      });
    } catch (expErr) {
      console.warn('Non-fatal: document export logging notice:', expErr);
    }
  },

  async exportSampleTestDeliverable(
    branding?: DocumentBrandingTemplate,
    orgName?: string,
    logoUrl?: string,
    format: 'pdf' | 'docx' = 'pdf'
  ): Promise<void> {
    const sampleDoc: ProjectDocument = {
      id: 'sample-test-doc',
      projectId: 'sample-project',
      projectName: 'Enterprise Core Platform Modernization',
      templateId: 1,
      docNumber: 'TAD-001',
      name: 'Technical Architecture & Verification Specification',
      phase: 'Design',
      version: '1.0',
      status: 'Approved',
      completion: 100,
      ownerName: 'Tech Lead / Architect',
      ownerId: 'usr-arch-1',
      createdAt: new Date().toLocaleDateString('en-GB'),
      lastUpdated: new Date().toLocaleDateString('en-GB'),
      description: 'Baseline Technical Architecture, deployment patterns, and verified engineering deliverables.',
      content: {
        system_architecture: 'Microservices architecture running on Kubernetes with multi-region replication.',
        security_specifications: 'TLS 1.3 encryption in transit, OAuth 2.0 / OIDC authentication with RBAC and AES-256 data at rest.',
        scalability_targets: 'Sub-100ms response time at 5,000 req/sec with auto-scaling pods.',
        cto_approval: 'Approved',
        approval_date: new Date().toLocaleDateString('en-GB'),
        approval_notes: 'Reviewed and certified for baseline deployment.',
      },
      history: [
        {
          version: '1.0',
          date: new Date().toLocaleDateString('en-GB'),
          author: 'Enterprise Architect',
          summary: 'Baseline design verification & sign-off',
        },
      ],
    };

    const sampleTasks: Task[] = [
      {
        id: 'sample-task-1',
        projectId: 'sample-project',
        projectName: 'Enterprise Core Platform Modernization',
        title: 'Core Microservices Architecture & Database Schema Design',
        description: 'Complete architecture review and DB normalization',
        assignedBy: 'usr-cto',
        assignedByName: 'Kamalesh S (CTO)',
        assignedByRole: 'CTO',
        assignedTo: 'usr-dev-1',
        assignedToName: 'Alex Morgan',
        assignedToRole: 'TL',
        status: 'Verified',
        priority: 'High',
        dueDate: new Date().toLocaleDateString('en-GB'),
        createdAt: new Date().toLocaleDateString('en-GB'),
        progress: 100,
        submission: {
          id: 'sub-1',
          submittedBy: 'usr-dev-1',
          submittedByName: 'Alex Morgan',
          submittedAt: new Date().toLocaleDateString('en-GB'),
          notes: 'Architecture schematics verified and reviewed against SLA standards.',
          fileUrls: ['architecture_v1.png', 'db_schema_ddl.sql'],
          referenceUrls: [],
        },
      },
      {
        id: 'sample-task-2',
        projectId: 'sample-project',
        projectName: 'Enterprise Core Platform Modernization',
        title: 'Security Hardening & RBAC Enforcement Review',
        description: 'Enforce role-based access control and token validation',
        assignedBy: 'usr-cto',
        assignedByName: 'Kamalesh S (CTO)',
        assignedByRole: 'CTO',
        assignedTo: 'usr-sec-1',
        assignedToName: 'Sarah Chen',
        assignedToRole: 'Employee',
        status: 'Verified',
        priority: 'High',
        dueDate: new Date().toLocaleDateString('en-GB'),
        createdAt: new Date().toLocaleDateString('en-GB'),
        progress: 100,
        submission: {
          id: 'sub-2',
          submittedBy: 'usr-sec-1',
          submittedByName: 'Sarah Chen',
          submittedAt: new Date().toLocaleDateString('en-GB'),
          notes: 'RBAC policies verified with zero security regression.',
          fileUrls: ['security_audit_report.pdf'],
          referenceUrls: [],
        },
      },
    ];

    if (format === 'docx') {
      await this.exportToDocx(sampleDoc, branding, orgName, sampleTasks);
    } else {
      await this.exportToPdf(sampleDoc, branding, orgName, logoUrl, sampleTasks);
    }
  },

  async bulkExport(docs: ProjectDocument[], format: 'docx' | 'pdf'): Promise<void> {
    for (const d of docs) {
      if (format === 'docx') {
        await this.exportToDocx(d);
      } else {
        await this.exportToPdf(d);
      }
    }
  },

  async autoFillAndExportDocx(
    doc: ProjectDocument,
    project: any,
    branding?: DocumentBrandingTemplate,
    orgName?: string,
    actorName?: string
  ): Promise<void> {
    const autoContent = {
      project_name: project?.name || doc.projectName,
      project_code: project?.code || 'PRJ',
      client_sponsor: project?.client || 'Client',
      sponsor: project?.sponsor || 'CTO Office',
      owner: project?.pmName || actorName || doc.ownerName,
      prepared_by: project?.pmName || actorName || 'Project Manager',
      phase: doc.phase,
      start_date: project?.startDate || doc.createdAt,
      target_end_date: project?.targetEndDate || 'Ongoing',
      executive_summary: project?.description || `Deliverable document for ${project?.name || doc.projectName}`,
      ...(doc.content || {}),
    };

    const populatedDoc: ProjectDocument = {
      ...doc,
      projectName: project?.name || doc.projectName,
      ownerName: project?.pmName || actorName || doc.ownerName,
      content: autoContent,
    };

    await this.exportToDocx(populatedDoc, branding, orgName);
  },

  /**
   * Generates a formal, printable PDF document of an individual team member's
   * entire project work portfolio, timings, break logs, deliverable submissions, documents authored/edited, and performance points.
   */
  async exportMemberPortfolioPdf(
    member: TeamMember,
    memberTasks: Task[],
    scopeLabel: string = 'Entire Project Scope',
    branding?: DocumentBrandingTemplate,
    orgName?: string,
    logoUrl?: string,
    memberDocuments: ProjectDocument[] = [],
    memberAuditLogs: any[] = []
  ): Promise<void> {
    const totalWorkMinutes = memberTasks.reduce(
      (sum, t) => sum + (t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60)),
      0
    );
    const totalBreakMinutes = memberTasks.reduce(
      (sum, t) => sum + (t.timeTracker?.totalBreakMinutes ?? 0),
      0
    );
    const totalEstimatedHours = memberTasks.reduce((sum, t) => sum + (t.estimatedHours || 8), 0);
    const verifiedTasks = memberTasks.filter((t) => t.status === 'Verified');
    const completionRate = memberTasks.length > 0 ? Math.round((verifiedTasks.length / memberTasks.length) * 100) : 0;
    const storyPointsEarned = verifiedTasks.length * 5 + Math.round(totalWorkMinutes / 60) + memberDocuments.length * 10;

    const formatMins = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return `${h}h ${m}m`;
    };

    const cachedAvatar = member.email ? localStorage.getItem(`unai_user_avatar_${member.email.toLowerCase()}`) : null;
    const memberAvatar =
      cachedAvatar ||
      (member.avatar && !member.avatar.includes('avataaars') ? member.avatar : null) ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}&backgroundColor=0d82ff,00d1ff,6366f1`;

    const companyName = branding?.header?.leftText || orgName || 'UNAI TECH PVT LTD';
    const effectiveLogo = logoUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=UNAI';

    // Watermark Configuration
    const watermarkText = branding?.watermark?.text || orgName || 'CONFIDENTIAL';
    const watermarkOpacity = (branding?.watermark?.opacity ?? 15) / 100;
    const isCustomWatermark = branding?.watermark?.type === 'custom';
    const customWatermarkImage = branding?.watermark?.customImageUrl;
    const isHorizontal = branding?.watermark?.orientation === 'horizontal';
    const rotation = isHorizontal ? '0deg' : '-30deg';

    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Work Portfolio — ${member.name}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.5;
            position: relative;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #1e3a8a;
            padding-bottom: 12px;
            margin-bottom: 18px;
            position: relative;
            z-index: 1;
          }
          .logo {
            max-height: 40px;
            max-width: 140px;
            object-fit: contain;
          }
          .company-title {
            font-size: 13px;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
          }
          .profile-banner {
            display: flex;
            align-items: center;
            gap: 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 14px;
            margin-bottom: 18px;
            position: relative;
            z-index: 1;
          }
          .avatar {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #0d82ff;
            background: #e2e8f0;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px;
            text-align: center;
          }
          .kpi-label {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
          }
          .kpi-value {
            font-size: 14px;
            font-weight: 900;
            color: #1e3a8a;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
            font-size: 10px;
            position: relative;
            z-index: 1;
          }
          th {
            background: #1b365d;
            color: #ffffff;
            font-weight: 700;
            padding: 6px 8px;
            text-align: left;
            border: 1px solid #1b365d;
          }
          td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            background: rgba(255, 255, 255, 0.85);
          }
          .section-title {
            font-size: 11px;
            font-weight: 800;
            color: #1e3a8a;
            text-transform: uppercase;
            margin: 16px 0 8px 0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            position: relative;
            z-index: 1;
          }
          .status-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 9px;
          }
          .status-verified { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
          .status-progress { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
          .status-open { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px dashed #cbd5e1;
            position: relative;
            z-index: 1;
          }
          .sign-box {
            border-top: 1px solid #94a3b8;
            padding-top: 6px;
            font-size: 10px;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <!-- Watermark Overlay -->
        ${
          branding?.watermark?.enabled !== false
            ? isCustomWatermark && customWatermarkImage
              ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${rotation}); opacity: ${watermarkOpacity}; pointer-events: none; z-index: 0;">
                  <img src="${customWatermarkImage}" style="max-width: 450px; max-height: 450px; object-fit: contain;" />
                 </div>`
              : `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(${rotation}); opacity: ${watermarkOpacity}; font-size: 64px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 6px; pointer-events: none; z-index: 0; white-space: nowrap; text-align: center;">
                  ${watermarkText}
                 </div>`
            : ''
        }

        <!-- Header -->
        <div class="header">
          <div>
            <div class="company-title">${companyName}</div>
            <div style="font-size: 10px; color: #64748b;">Engineering Governance & Performance Record</div>
          </div>
          ${logoUrl ? `<img src="${effectiveLogo}" class="logo" alt="Logo" />` : `<div style="font-weight: 800; font-size: 12px; color: #0d82ff;">UNAI CRM</div>`}
        </div>

        <!-- Title -->
        <div style="text-align: center; margin-bottom: 16px; position: relative; z-index: 1;">
          <h2 style="margin: 0; font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            Individual Work Portfolio & Performance Report
          </h2>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
            Scope: <strong>${scopeLabel}</strong> | Generated: <strong>${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          </div>
        </div>

        <!-- Member Profile Banner -->
        <div class="profile-banner">
          <img src="${memberAvatar}" class="avatar" alt="${member.name}" />
          <div style="flex: 1;">
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${member.name}</div>
            <div style="font-size: 11px; color: #0d82ff; font-weight: 700;">
              ${member.designation || member.role} • <span style="color: #475569;">${member.department || 'Engineering'}</span>
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 3px;">
              Email: <strong>${member.email}</strong> | Access: <strong>${member.accessLevel || 'Task Access'}</strong>
            </div>
          </div>
        </div>

        <!-- KPI Metrics Grid -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Actual Work Logged</div>
            <div class="kpi-value">${formatMins(totalWorkMinutes)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Breaks / Delays</div>
            <div class="kpi-value" style="color: #d97706;">${formatMins(totalBreakMinutes)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Tasks Completed</div>
            <div class="kpi-value" style="color: #059669;">${verifiedTasks.length} / ${memberTasks.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Performance Points</div>
            <div class="kpi-value" style="color: #6366f1;">${storyPointsEarned} pts</div>
          </div>
        </div>

        <!-- Section 1: Itemized Tasks & Deliverables Table -->
        <div class="section-title">1. Itemized Work Execution & Deliverables (${memberTasks.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Task / Directive</th>
              <th style="width: 20%;">Feature Module</th>
              <th style="width: 15%;">Supervisor / Lead</th>
              <th style="width: 15%;">Time Logged</th>
              <th style="width: 12%;">Status</th>
              <th style="width: 13%;">Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${
              memberTasks.length === 0
                ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">No direct tasks assigned within this scope.</td></tr>`
                : memberTasks
                    .map((t) => {
                      const workM = t.timeTracker?.totalWorkMinutes ?? Math.round((t.actualHours || 0) * 60);
                      const breakM = t.timeTracker?.totalBreakMinutes ?? 0;
                      const statusClass =
                        t.status === 'Verified'
                          ? 'status-verified'
                          : t.status === 'In Progress' || t.status === 'Submitted'
                          ? 'status-progress'
                          : 'status-open';

                      return `
                      <tr>
                        <td>
                          <strong>${t.title}</strong>
                          ${t.description ? `<div style="color: #64748b; font-size: 9px; margin-top: 2px;">${t.description.slice(0, 70)}...</div>` : ''}
                        </td>
                        <td>${t.featureName || t.projectName || 'Core Module'}</td>
                        <td>${t.assignedByName || 'Lead'}</td>
                        <td>
                          <strong style="color: #1e40af;">${formatMins(workM)}</strong>
                          <div style="font-size: 9px; color: #d97706;">Breaks: ${formatMins(breakM)}</div>
                        </td>
                        <td><span class="status-badge ${statusClass}">${t.status}</span></td>
                        <td>${t.dueDate || 'Standard'}</td>
                      </tr>
                    `;
                    })
                    .join('')
            }
          </tbody>
        </table>

        <!-- Section 2: Documents Authored & Filled -->
        <div class="section-title">2. Standard Documents Authored, Filled & Approved (${memberDocuments.length})</div>
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">Document Name</th>
              <th style="width: 25%;">Project & Phase</th>
              <th style="width: 15%;">Version</th>
              <th style="width: 15%;">Status</th>
              <th style="width: 15%;">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${
              memberDocuments.length === 0
                ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 10px;">No documents directly owned or authored by this member.</td></tr>`
                : memberDocuments
                    .map((d) => `
                    <tr>
                      <td><strong>${d.name}</strong></td>
                      <td>${d.projectName} (${d.phase})</td>
                      <td>v${d.version || '1.0'}</td>
                      <td><span class="status-badge ${d.status === 'Approved' ? 'status-verified' : 'status-progress'}">${d.status}</span></td>
                      <td>${d.lastUpdated || d.createdAt}</td>
                    </tr>
                  `)
                    .join('')
            }
          </tbody>
        </table>

        <!-- Section 3: Deliverable Notes & Remarks History -->
        <div class="section-title">3. Submission Notes & Supervisor Feedback Log</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">Task Item</th>
              <th style="width: 35%;">Submission Notes & Deliverables</th>
              <th style="width: 40%;">Supervisor Review Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${
              memberTasks.filter((t) => t.submission || (t.statusLogs && t.statusLogs.length > 0)).length === 0
                ? `<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 10px;">No deliverable submissions recorded yet.</td></tr>`
                : memberTasks
                    .filter((t) => t.submission || (t.statusLogs && t.statusLogs.length > 0))
                    .map((t) => {
                      const latestRemark =
                        t.statusLogs && t.statusLogs.length > 0
                          ? t.statusLogs[t.statusLogs.length - 1].remarks
                          : t.status === 'Verified'
                          ? 'Verified and approved by Technical Lead'
                          : 'Under review';

                      return `
                      <tr>
                        <td><strong>${t.title}</strong></td>
                        <td>
                          ${t.submission?.notes ? `<div style="font-style: italic; color: #334155;">"${t.submission.notes}"</div>` : '<span style="color: #94a3b8;">No notes</span>'}
                          ${t.submission?.fileUrls && t.submission.fileUrls.length > 0 ? `<div style="font-size: 9px; color: #2563eb; margin-top: 3px;">📎 Files: ${t.submission.fileUrls.join(', ')}</div>` : ''}
                        </td>
                        <td>
                          <div style="color: #1e3a8a; font-weight: 600;">${latestRemark}</div>
                        </td>
                      </tr>
                    `;
                    })
                    .join('')
            }
          </tbody>
        </table>

        <!-- Section 4: System Actions & Audit Trail -->
        ${
          memberAuditLogs.length > 0
            ? `
          <div class="section-title">4. Recent System Activity & Governance Mutation Log</div>
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Timestamp</th>
                <th style="width: 25%;">Action</th>
                <th style="width: 20%;">Entity</th>
                <th style="width: 35%;">Activity Details</th>
              </tr>
            </thead>
            <tbody>
              ${memberAuditLogs.slice(0, 8).map((log) => `
                <tr>
                  <td>${log.timestamp}</td>
                  <td><strong>${log.action}</strong></td>
                  <td>${log.entityType} (${log.entityId?.slice(0, 8) || '-'})</td>
                  <td>${log.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          `
            : ''
        }

        <!-- Certification & Sign-off Block -->
        <div class="signature-grid">
          <div>
            <div class="sign-box">
              <strong>Employee Signature:</strong> ${member.name}<br/>
              <span>Date: ${new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
          <div>
            <div class="sign-box">
              <strong>Technical Lead / PM Verification:</strong> Verified & Certified<br/>
              <span>Date: ${new Date().toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 400);
    }
  },
};
