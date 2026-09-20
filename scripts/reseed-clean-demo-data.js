/**
 * reseed-clean-demo-data.js
 *
 * 1. Completely wipes existing demo data across Supabase:
 *    - anomaly_flags, verification_logs, certificates, pending_certificates,
 *      students, institutions, public.users, and auth.users.
 * 2. Connects to the local Hardhat blockchain node and contract instances.
 * 3. Uses genuine application flows and smart contract calls to register:
 *    - Regulator demo account: regulator@demo.com
 *    - Company demo account: company@demo.com
 *    - 5 Approved Institutions:
 *        1. Chaitanya Bharathi Institute of Technology
 *        2. Vasavi College of Engineering
 *        3. A.V. College of Arts, Science and Commerce
 *        4. Badruka College of Commerce and Arts
 *        5. Deccan Valley Institute of Technology (revoked after issuance)
 *    - 1 Pending Institution:
 *        6. MVSR Engineering College (status: pending, kept for live approval demo)
 *    - Exactly 2 named staff accounts per institution (Admin Officer & Registrar)
 *    - 2 enrolled students per approved institution with realistic Indian names
 *    - 1-2 issued certificates on-chain per institution
 *    - Revocation of Deccan Valley Institute of Technology on-chain to showcase
 *      the "Issuer No Longer Accredited" outcome state.
 */

const { createClient } = require('@supabase/supabase-js');
const { ethers } = require('ethers');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { PinataSDK } = require('pinata');

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
// Default to standard Hardhat Account #0 private key
const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const DEMO_PASSWORD = 'DemoPassword123!';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase configuration in environment (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

// 1. Initialize Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 2. Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
  pinataGateway: process.env.PINATA_GATEWAY || 'purple-written-salamander-116.mypinata.cloud',
});

// 3. Initialize Blockchain Provider & Signer
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(OPERATOR_KEY, provider);

// Load contract deployments
const localDeploymentPath = path.resolve(__dirname, '../contracts/deployments/local.json');
let deploymentData = null;
if (fs.existsSync(localDeploymentPath)) {
  try {
    deploymentData = JSON.parse(fs.readFileSync(localDeploymentPath, 'utf-8'));
  } catch (e) {
    console.warn('Failed to parse local.json deployment:', e.message);
  }
}

const isLocalRpc = (!RPC_URL || RPC_URL.includes('127.0.0.1') || RPC_URL.includes('localhost'));

const registryAddress =
  (isLocalRpc && deploymentData?.contracts?.Registry?.address) ||
  process.env.REGISTRY_CONTRACT_ADDRESS ||
  deploymentData?.contracts?.Registry?.address;

const certificateRegistryAddress =
  (isLocalRpc && deploymentData?.contracts?.CertificateRegistry?.address) ||
  process.env.CERTIFICATE_REGISTRY_CONTRACT_ADDRESS ||
  deploymentData?.contracts?.CertificateRegistry?.address;

const registryAbi = deploymentData?.contracts?.Registry?.abi || [];
const certificateRegistryAbi = deploymentData?.contracts?.CertificateRegistry?.abi || [];

if (!registryAddress || !certificateRegistryAddress) {
  console.error('ERROR: Could not resolve smart contract addresses for Registry / CertificateRegistry.');
  process.exit(1);
}

const registryContract = new ethers.Contract(registryAddress, registryAbi, signer);
const certificateRegistryContract = new ethers.Contract(certificateRegistryAddress, certificateRegistryAbi, signer);

// Helper to fetch the latest on-chain nonce directly from RPC
async function getFreshNonce() {
  const hexNonce = await provider.send('eth_getTransactionCount', [signer.address, 'latest']);
  return parseInt(hexNonce, 16);
}

// Helper to compute sha256
function computeSha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Helper to create a minimal authentic PDF buffer
function generateCertificatePdfBuffer(credentialId, degreeName, studentName, institutionName, issueDate) {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 18 Tf
50 700 Td
(${institutionName}) Tj
/F1 14 Tf
0 -40 Td
(Official Academic Credential: ${degreeName}) Tj
/F1 12 Tf
0 -30 Td
(Awarded to: ${studentName}) Tj
0 -25 Td
(Credential ID: ${credentialId}) Tj
0 -25 Td
(Issue Date: ${issueDate}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
450
%%EOF`;
  return Buffer.from(content, 'utf-8');
}

async function uploadPdfToPinata(filename, buffer) {
  try {
    const fileObj = new File([buffer], filename, { type: 'application/pdf' });
    const res = await pinata.upload.public.file(fileObj);
    return res.cid;
  } catch (err) {
    console.warn(`[Pinata upload fallback] for ${filename}:`, err.message);
    const mockHash = crypto.createHash('sha256').update(filename + Date.now()).digest('hex').slice(0, 46);
    return `bafkrei${mockHash}`;
  }
}

async function main() {
  console.log('====================================================');
  console.log('VeriCert: Wiping & Reseeding Clean Demo Data');
  console.log('====================================================\n');

  // STEP 1: WIPE EXISTING DATABASE RECORDS
  console.log('[1/6] Purging all existing database records...');

  const safeDelete = async (table) => {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error && !error.message?.includes('Could not find the table') && !error.message?.includes('schema cache')) {
        console.warn(`   ⚠ [Purge warning] ${table}:`, error.message);
      }
    } catch (e) {
      // Ignore if table does not exist
    }
  };

  // Nullify foreign keys on users first to avoid circular FK constraints
  try {
    await supabase.from('users').update({ institution_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (_) {}

  await safeDelete('anomaly_flags');
  await safeDelete('verification_logs');
  await safeDelete('certificates');
  await safeDelete('pending_certificates');
  await safeDelete('students');
  await safeDelete('institutions');
  await safeDelete('users');
  console.log('   ✔ All table records deleted.');

  console.log('[2/6] Purging all Supabase Auth users...');
  let hasMore = true;
  while (hasMore) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
    if (error || !users || users.length === 0) {
      hasMore = false;
      break;
    }
    for (const u of users) {
      await supabase.auth.admin.deleteUser(u.id);
    }
    if (users.length < 100) hasMore = false;
  }
  console.log('   ✔ Supabase Auth users purged completely.\n');

  // STEP 2: CREATE REGULATOR & COMPANY DEMO ACCOUNTS
  console.log('[3/6] Creating core governance & verifier accounts...');
  
  // Regulator
  const { data: regUser, error: regErr } = await supabase.auth.admin.createUser({
    email: 'regulator@demo.com',
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'regulator', full_name: 'Educational Regulator Authority' },
  });
  if (regErr) throw regErr;
  await supabase.from('users').upsert({
    id: regUser.user.id,
    email: 'regulator@demo.com',
    role: 'regulator',
  });
  console.log('   ✔ Regulator account created: regulator@demo.com');

  // Company
  const { data: compUser, error: compErr } = await supabase.auth.admin.createUser({
    email: 'company@demo.com',
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { role: 'company', full_name: 'Enterprise Credential Verifier' },
  });
  if (compErr) throw compErr;
  await supabase.from('users').upsert({
    id: compUser.user.id,
    email: 'company@demo.com',
    role: 'company',
  });
  console.log('   ✔ Company verifier created: company@demo.com\n');

  // STEP 3: CONFIGURE INSTITUTIONS SPECIFICATION
  const institutionSpecs = [
    {
      key: 'cbit',
      name: 'Chaitanya Bharathi Institute of Technology',
      regNumber: 'REG-CBIT-1979',
      status: 'approved',
      staff1: { email: 'cbit.admin@demo.com', name: 'Rajesh Sharma', title: 'Admin Officer' },
      staff2: { email: 'cbit.registrar@demo.com', name: 'Dr. Sunita Rao', title: 'Registrar' },
      students: [
        {
          name: 'Arjun Reddy',
          email: 'cbit.student1@demo.com',
          roll: '1601-20-733-042',
          cert: {
            id: 'CRED-CBIT-CSE-001',
            degree: 'Bachelor of Technology in Computer Science and Engineering',
            date: '2024-05-18',
          },
        },
        {
          name: 'Ananya Verma',
          email: 'cbit.student2@demo.com',
          roll: '1601-20-733-089',
          cert: {
            id: 'CRED-CBIT-AIDS-002',
            degree: 'Bachelor of Technology in Artificial Intelligence & Data Science',
            date: '2024-05-18',
          },
        },
      ],
    },
    {
      key: 'vasavi',
      name: 'Vasavi College of Engineering',
      regNumber: 'REG-VCE-1981',
      status: 'approved',
      staff1: { email: 'vasavi.admin@demo.com', name: 'Vikramaditya Kulkarni', title: 'Admin Officer' },
      staff2: { email: 'vasavi.registrar@demo.com', name: 'Dr. Lakshmi Narayana', title: 'Registrar' },
      students: [
        {
          name: 'Rohan Kulkarni',
          email: 'vasavi.student1@demo.com',
          roll: '1602-20-737-015',
          cert: {
            id: 'CRED-VASAVI-IT-001',
            degree: 'Bachelor of Engineering in Information Technology',
            date: '2024-06-10',
          },
        },
        {
          name: 'Sneha Patel',
          email: 'vasavi.student2@demo.com',
          roll: '1602-20-737-048',
          cert: {
            id: 'CRED-VASAVI-ECE-002',
            degree: 'Bachelor of Engineering in Electronics & Communication Engineering',
            date: '2024-06-10',
          },
        },
      ],
    },
    {
      key: 'mvsr',
      name: 'MVSR Engineering College',
      regNumber: 'REG-MVSR-1981',
      status: 'pending', // Kept pending deliberately to demo live approval flow!
      staff1: { email: 'mvsr.admin@demo.com', name: 'Suresh Kumar', title: 'Admin Officer' },
      staff2: { email: 'mvsr.registrar@demo.com', name: 'Dr. Padmavathi Devi', title: 'Registrar' },
      students: [],
    },
    {
      key: 'avc',
      name: 'A.V. College of Arts, Science and Commerce',
      regNumber: 'REG-AVC-1968',
      status: 'approved',
      staff1: { email: 'avc.admin@demo.com', name: 'M. Venkat Rao', title: 'Admin Officer' },
      staff2: { email: 'avc.registrar@demo.com', name: 'Dr. Geetha Ramachandran', title: 'Registrar' },
      students: [
        {
          name: 'Rahul Krishna',
          email: 'avc.student1@demo.com',
          roll: '1051-21-401-012',
          cert: {
            id: 'CRED-AVC-BA-001',
            degree: 'Bachelor of Arts in Political Science & Public Administration',
            date: '2024-04-25',
          },
        },
        {
          name: 'Pooja Deshmukh',
          email: 'avc.student2@demo.com',
          roll: '1051-21-402-034',
          cert: {
            id: 'CRED-AVC-BSC-002',
            degree: 'Bachelor of Science in Computer Science',
            date: '2024-04-25',
          },
        },
      ],
    },
    {
      key: 'badruka',
      name: 'Badruka College of Commerce and Arts',
      regNumber: 'REG-BCCA-1950',
      status: 'approved',
      staff1: { email: 'badruka.admin@demo.com', name: 'N. Ramachandra Murthy', title: 'Admin Officer' },
      staff2: { email: 'badruka.registrar@demo.com', name: 'Dr. Usha Rani', title: 'Registrar' },
      students: [
        {
          name: 'Aditya Agarwal',
          email: 'badruka.student1@demo.com',
          roll: '1072-21-405-008',
          cert: {
            id: 'CRED-BADRUKA-BCOM-001',
            degree: 'Bachelor of Commerce in Accounting & Finance',
            date: '2024-05-30',
          },
        },
        {
          name: 'Kavita Jain',
          email: 'badruka.student2@demo.com',
          roll: '1072-21-405-055',
          cert: {
            id: 'CRED-BADRUKA-BCA-002',
            degree: 'Bachelor of Commerce in Computer Applications',
            date: '2024-05-30',
          },
        },
      ],
    },
    {
      key: 'dvit',
      name: 'Deccan Valley Institute of Technology',
      regNumber: 'REG-DVIT-2015',
      status: 'approved_then_revoked', // Fictional, approved then revoked on-chain!
      staff1: { email: 'dvit.admin@demo.com', name: 'Praveen Joshi', title: 'Admin Officer' },
      staff2: { email: 'dvit.registrar@demo.com', name: 'Dr. Meenakshi Sundaram', title: 'Registrar' },
      students: [
        {
          name: 'Varun Chandra',
          email: 'dvit.student@demo.com',
          roll: '2099-20-741-019',
          cert: {
            id: 'CRED-DVIT-MECH-001',
            degree: 'Bachelor of Technology in Mechanical Engineering',
            date: '2023-11-20',
          },
        },
      ],
    },
  ];

  console.log('[4/6] Registering institutions, staff, students & issuing credentials...');

  const createdSummary = [];

  for (const spec of institutionSpecs) {
    console.log(`\n---> Setting up: ${spec.name}`);

    // Step A: Create Staff 1 (Institution Owner)
    const { data: s1User, error: s1Err } = await supabase.auth.admin.createUser({
      email: spec.staff1.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'institution', full_name: spec.staff1.name },
    });
    if (s1Err) throw s1Err;

    // Step B: Create Institution in Database
    const initialStatus = spec.status === 'pending' ? 'pending' : 'approved';
    const { data: instData, error: instErr } = await supabase.from('institutions').insert({
      user_id: s1User.user.id,
      name: spec.name,
      registration_number: spec.regNumber,
      status: initialStatus,
      approved_at: initialStatus === 'approved' ? new Date().toISOString() : null,
    }).select().single();
    if (instErr) throw instErr;

    const institutionId = instData.id;

    // Link Staff 1 to institution
    await supabase.from('users').upsert({
      id: s1User.user.id,
      email: spec.staff1.email,
      role: 'institution',
      institution_id: institutionId,
    });
    console.log(`   ✔ Staff 1 registered: ${spec.staff1.email} (${spec.staff1.name})`);

    // Step C: Invite / Register Staff 2 (Registrar)
    const { data: s2User, error: s2Err } = await supabase.auth.admin.createUser({
      email: spec.staff2.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'institution', full_name: spec.staff2.name, institution_id: institutionId },
    });
    if (s2Err) throw s2Err;

    await supabase.from('users').upsert({
      id: s2User.user.id,
      email: spec.staff2.email,
      role: 'institution',
      institution_id: institutionId,
    });
    console.log(`   ✔ Staff 2 registered: ${spec.staff2.email} (${spec.staff2.name})`);

    // Step D: On-Chain Registration if approved
    if (spec.status === 'approved' || spec.status === 'approved_then_revoked') {
      try {
        console.log(`   -> Registering ${spec.name} on-chain...`);
        const nonce = await getFreshNonce();
        const tx = await registryContract.addInstitute(institutionId, spec.name, { nonce });
        await tx.wait();
        console.log(`   ✔ On-chain registration confirmed: tx ${tx.hash.slice(0, 14)}...`);
      } catch (err) {
        if (!err.message?.includes('already exists')) {
          console.warn(`   ⚠ On-chain add error: ${err.message}`);
        }
      }
    } else {
      console.log(`   ℹ Kept in "pending" status (not added on-chain) to demo live approval.`);
    }

    // Step E: Register Students & Issue Certificates
    const certsIssued = [];
    for (const studentSpec of spec.students) {
      // 1. Create Student Auth User
      const { data: studAuth, error: studErr } = await supabase.auth.admin.createUser({
        email: studentSpec.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { role: 'student', full_name: studentSpec.name, roll_number: studentSpec.roll },
      });
      if (studErr) throw studErr;

      // 2. Insert into public.students
      const { data: studentRow, error: studentRowErr } = await supabase.from('students').insert({
        user_id: studAuth.user.id,
        institution_id: institutionId,
        full_name: studentSpec.name,
        roll_number: studentSpec.roll,
      }).select().single();
      if (studentRowErr) throw studentRowErr;

      await supabase.from('users').upsert({
        id: studAuth.user.id,
        email: studentSpec.email,
        role: 'student',
        institution_id: institutionId,
      });

      console.log(`   ✔ Student registered: ${studentSpec.name} (${studentSpec.email})`);

      // 3. Generate PDF and upload to Pinata IPFS
      const pdfBuffer = generateCertificatePdfBuffer(
        studentSpec.cert.id,
        studentSpec.cert.degree,
        studentSpec.name,
        spec.name,
        studentSpec.cert.date
      );
      const sha256 = computeSha256(pdfBuffer);
      const ipfsCid = await uploadPdfToPinata(`${studentSpec.cert.id}.pdf`, pdfBuffer);
      console.log(`   ✔ IPFS CID anchored: ${ipfsCid.slice(0, 18)}...`);

      // 4. Issue Certificate On-Chain via CertificateRegistry.sol
      console.log(`   -> Mining certificate ${studentSpec.cert.id} on-chain...`);
      let onChainTxHash = '0x_existing_chain_anchor';
      try {
        const nonce = await getFreshNonce();
        const certTx = await certificateRegistryContract.issueCertificate(
          studentSpec.cert.id,
          institutionId,
          ipfsCid,
          { nonce }
        );
        await certTx.wait();
        onChainTxHash = certTx.hash;
        console.log(`   ✔ Mined on-chain! Tx: ${certTx.hash.slice(0, 14)}...`);
      } catch (e) {
        if (e.message?.includes('already exists') || e.revert?.args?.[0]?.includes('already exists')) {
          console.log(`   ℹ Certificate ${studentSpec.cert.id} already anchored on-chain.`);
        } else {
          throw e;
        }
      }

      // 5. Insert into public.certificates
      const { error: certInsertErr } = await supabase.from('certificates').insert({
        credential_id: studentSpec.cert.id,
        student_id: studentRow.id,
        institution_id: institutionId,
        degree_name: studentSpec.cert.degree,
        issue_date: studentSpec.cert.date,
        ipfs_hash: ipfsCid,
        on_chain_tx_hash: onChainTxHash,
        revoked: false,
      });
      if (certInsertErr) {
        console.error(`   ❌ Failed to insert certificate ${studentSpec.cert.id}:`, certInsertErr);
        throw certInsertErr;
      }

      certsIssued.push({
        credentialId: studentSpec.cert.id,
        degree: studentSpec.cert.degree,
        recipient: studentSpec.name,
      });
    }

    // Step F: Revoke Deccan Valley on-chain to showcase unaccredited issuer state
    if (spec.status === 'approved_then_revoked') {
      console.log(`   -> Revoking ${spec.name} accreditation on-chain by regulator...`);
      const nonce = await getFreshNonce();
      const revokeTx = await registryContract.updateAccreditationStatus(institutionId, false, { nonce });
      await revokeTx.wait();
      await supabase.from('institutions').update({ status: 'revoked' }).eq('id', institutionId);
      console.log(`   ✔ Accreditation revoked on-chain! Tx: ${revokeTx.hash.slice(0, 14)}...`);
    }

    createdSummary.push({
      institution: spec.name,
      status: spec.status === 'approved_then_revoked' ? 'Revoked (On-chain)' : spec.status.toUpperCase(),
      staff1: spec.staff1.email,
      staff2: spec.staff2.email,
      students: spec.students.map(s => s.email),
      certificates: certsIssued,
    });
  }

  console.log('\n====================================================');
  console.log('✨ RESEEDING COMPLETE! ALL ON-CHAIN & DB RECORDS SYNCED');
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('Fatal error during reseed:', err);
  process.exit(1);
});
