import mongoose from '../server/node_modules/mongoose/index.js';
import Standard from '../server/src/models/Standard.js';
import { env } from '../server/src/config/env.js';

const standards = [
  {
    standardNumber: 'IS 17550 : Part 1 (2024)',
    title: 'Household Refrigerating Appliances - Characteristics and Test Methods Part 1 General Requirements (First Revision)',
    description: 'BIS-listed standard for general requirements and test methods for household refrigerating appliances.',
    category: 'Refrigerating Appliances',
    productCategory: 'Refrigerators',
    keywords: ['refrigerating appliances', 'refrigerators', 'general requirements', 'test methods', 'household refrigerating appliances'],
    edition: '2024', status: 'active', verified: true,
    source: { name: 'Bureau of Indian Standards', url: 'https://www.bis.gov.in/wp-content/uploads/2025/02/PM-17550-1-fEB-2025.pdf', publisher: 'BIS' },
    lastVerifiedAt: new Date()
  },
  {
    standardNumber: 'IS 17550 : Part 2 (2024)',
    title: 'Household Refrigerating Appliances - Characteristics and Test Methods Part 2 Performance Requirements (First Revision)',
    description: 'BIS-listed standard for performance requirements and test methods for household refrigerating appliances.',
    category: 'Refrigerating Appliances',
    productCategory: 'Refrigerators',
    keywords: ['refrigerating appliances', 'refrigerators', 'performance requirements', 'test methods'],
    edition: '2024', status: 'active', verified: true,
    source: { name: 'Bureau of Indian Standards', url: 'https://lims.bis.gov.in/home/search_is_number/?is_number__doc_no=17550&page=1', publisher: 'BIS' },
    lastVerifiedAt: new Date()
  },
  {
    standardNumber: 'IS 17550 : Part 3 (2025)',
    title: 'Household Refrigerating Appliances - Characteristics and Methods Of Test Part 3 Energy Consumption and Volume (First Revision)',
    description: 'BIS-listed standard for energy consumption and volume testing of household refrigerating appliances.',
    category: 'Refrigerating Appliances',
    productCategory: 'Refrigerators',
    keywords: ['refrigerating appliances', 'refrigerators', 'energy consumption', 'volume', 'test methods'],
    edition: '2025', status: 'active', verified: true,
    source: { name: 'Bureau of Indian Standards', url: 'https://lims.bis.gov.in/home/search_is_number/?is_number__doc_no=17550&page=1', publisher: 'BIS' },
    lastVerifiedAt: new Date()
  },
  {
    standardNumber: 'IS 18689 (2024)',
    title: 'Household and Similar Electrical Appliances - Safety - Particular Requirements for Commercial Refrigerating Appliances and Ice-Makers with an Incorporated or Remote Refrigerant Unit or Motor-Compressor (IEC 60335-2-89 : 2019, MOD)',
    description: 'BIS-listed safety standard for commercial refrigerating appliances and ice-makers with incorporated or remote refrigerant units or motor-compressors.',
    category: 'Electrical Safety',
    productCategory: 'Commercial Refrigerating Appliances',
    keywords: ['commercial refrigerating appliances', 'electrical safety', 'ice-makers', 'refrigerant unit', 'motor-compressor', 'safety'],
    edition: '2024', status: 'active', verified: true,
    source: { name: 'Bureau of Indian Standards', url: 'https://lims.bis.gov.in/home_lab_scope/74/', publisher: 'BIS' },
    lastVerifiedAt: new Date()
  }
];

await mongoose.connect(env.MONGODB_URI);
for (const data of standards) {
  const result = await Standard.findOneAndUpdate(
    { standardNumber: data.standardNumber, edition: data.edition },
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log(`${result.standardNumber} -> ${result._id}`);
}
await mongoose.disconnect();
console.log('Refrigerator demo standards seeded/updated.');
