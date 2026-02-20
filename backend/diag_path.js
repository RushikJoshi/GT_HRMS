const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.useDb('company_6985c4f09007156530c4cb1c');

    const GeneratedLetter = db.model('GeneratedLetter', new mongoose.Schema({}, { strict: false }));

    const id1 = '6994336ada90fd38c0a503e1';
    const id2 = '699444d9c5a189b20f6d09ab';

    console.log('Searching for ID 1:', id1);
    const l1 = await GeneratedLetter.findById(id1).lean();
    if (l1) console.log('Found ID 1:', l1.pdfPath, l1.status);
    else console.log('ID 1 not found');

    console.log('Searching for ID 2:', id2);
    const l2 = await GeneratedLetter.findById(id2).lean();
    if (l2) console.log('Found ID 2:', l2.pdfPath, l2.status);
    else console.log('ID 2 not found');

    await mongoose.disconnect();
}

check();
