import jsPDF from 'jspdf';

/**
 * Generates an official downloadable PDF Verification Report for company HR records.
 * Rendered in the VeriCert Editorial / Museum aesthetic (parchment, ink black, burgundy, muted gold).
 *
 * @param {Object} outcome - The verification outcome from verifyCertificate
 * @param {string} userEmail - The email of the verifier / company HR officer
 */
export function generateVerificationReport(outcome, userEmail = 'Employer HR Verifier') {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // 1. Header Banner - Deep Burgundy Background (#5C1F2E)
  doc.setFillColor(92, 31, 46); // #5C1F2E
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(242, 239, 231); // #F2EFE7 (Parchment)
  doc.text('OFFICIAL BLOCKCHAIN CREDENTIAL VERIFICATION AUDIT', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(215, 205, 195);
  doc.text('Decentralized Academic Qualification Verification Network • Immutable Ledger Audit', margin, 23);

  y = 42;

  // 2. Report Metadata Box
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 88, 80); // #5C5850
  doc.text(`REPORT REFERENCE: AUDIT-${Date.now().toString().slice(-8)}`, margin, y);
  const now = new Date();
  const timestampStr = `${now.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  doc.text(`VERIFICATION TIMESTAMP: ${timestampStr}`, pageWidth - margin, y, { align: 'right' });

  y += 6;
  doc.setDrawColor(220, 216, 206); // Hairline divider
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 10;

  // 3. Status Outcome Banner - Uses the exact museum tokens
  const state = outcome.state || (outcome.isValid ? 'VALID' : 'REVOKED');
  let bannerColor = [92, 31, 46]; // #5C1F2E (--accent-primary)
  let statusText = 'AUTHENTIC & VALID CREDENTIAL';
  let subText = 'This credential was cryptographically validated against the on-chain registry and is untampered.';

  if (state === 'REVOKED' || outcome.revoked) {
    bannerColor = [140, 59, 59]; // #8C3B3B (--accent-revoked)
    statusText = 'CREDENTIAL REVOKED BY INSTITUTION';
    subText = 'This credential has been revoked by the issuing institution and is no longer valid for qualification.';
  } else if (state === 'UNACCREDITED' || !outcome.isInstituteAccredited) {
    bannerColor = [168, 118, 63]; // #A8763F (--accent-unaccredited)
    statusText = 'ISSUER NO LONGER ACCREDITED';
    subText = 'The issuing institution was previously accredited, but its accreditation has since been revoked by the regulator.';
  } else if (state === 'NOT_FOUND') {
    bannerColor = [92, 88, 80]; // #5C5850 (--text-secondary)
    statusText = 'CREDENTIAL NOT FOUND ON LEDGER';
    subText = 'No record matching this credential ID was located on the immutable blockchain registry.';
  }

  // Draw Outcome Box
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'F');

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(250, 248, 244);
  doc.text(statusText, margin + 8, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(242, 239, 231);
  doc.text(subText, margin + 8, y + 16, { maxWidth: contentWidth - 16 });

  y += 32;

  // 4. Academic Qualification Details Section
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(33, 29, 26); // #211D1A (Ink black)
  doc.text('1. ACADEMIC QUALIFICATION PARTICULARS', margin, y);

  y += 4;
  doc.setDrawColor(220, 216, 206);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  const renderDataRow = (label, value, isCode = false) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(92, 88, 80); // #5C5850
    doc.text(label, margin + 2, y);

    doc.setFont(isCode ? 'courier' : 'helvetica', isCode ? 'bold' : 'normal');
    doc.setTextColor(33, 29, 26); // #211D1A
    doc.text(value || 'N/A', margin + 60, y, { maxWidth: contentWidth - 65 });

    y += 8;
  };

  renderDataRow('Credential ID:', outcome.credentialId, true);
  renderDataRow('Program / Degree Title:', outcome.degreeName || 'Academic Credential');
  renderDataRow('Candidate / Graduate:', outcome.studentName || 'Registered Student');
  renderDataRow('Issuing Institution:', outcome.institutionName || `Institution ID: ${outcome.institutionId || 'N/A'}`);
  renderDataRow('Original Issue Date:', outcome.issueDate || 'Recorded on Blockchain');

  y += 4;

  // 5. Blockchain Security & Cryptographic Ledger Proof
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(33, 29, 26);
  doc.text('2. CRYPTOGRAPHIC PROOF & REGISTRATION DATA', margin, y);

  y += 4;
  doc.setDrawColor(220, 216, 206);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  renderDataRow('Blockchain Network:', 'Local Hardhat EVM Node (Chain ID: 31337)');
  renderDataRow(
    'Institution Accreditation:',
    outcome.isInstituteAccredited ? 'Active & Accredited on-chain' : 'Accreditation Revoked'
  );
  renderDataRow(
    'Revocation Flag:',
    outcome.revoked ? 'True (Revoked)' : 'False (Active / In Good Standing)'
  );
  renderDataRow('IPFS Document CID:', outcome.ipfsHash || 'Anchored on IPFS', true);

  y += 8;

  // 6. Regulatory Compliance & Live Status Disclaimer Note
  doc.setFillColor(250, 248, 244); // #FAF8F4 (Raised paper)
  doc.setDrawColor(220, 216, 206);
  doc.roundedRect(margin, y, contentWidth, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 88, 80);
  doc.text('AUDIT & COMPLIANCE VERIFICATION NOTICE:', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(92, 88, 80);
  const disclaimer =
    'This verification report reflects the live, cryptographic status recorded on the blockchain registry at the exact time of this check. Academic institutions and authorized regulators maintain on-chain authority to update accreditation or revoke credentials in accordance with compliance governance. This document is suitable for official Human Resources and organizational auditing files.';
  doc.text(disclaimer, margin + 5, y + 13, { maxWidth: contentWidth - 10, lineHeightFactor: 1.3 });

  y += 38;

  // 7. Sign-off / HR Record details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 88, 80);
  doc.text(`Audited by: ${userEmail}`, margin, y);
  doc.text('Verification Registry: CertificateRegistry.sol', pageWidth - margin, y, { align: 'right' });

  // Save the PDF
  const filename = `${outcome.credentialId || 'credential'}-verification-report.pdf`;
  doc.save(filename);
}
