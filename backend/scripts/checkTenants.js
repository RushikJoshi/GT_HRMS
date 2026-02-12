require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hrms';

(async () => {
  try {
    console.log('Connecting to:', MONGO_URI.replace(/(mongodb(?:\+srv)?:\/\/)([^:@\/\n]+)(:[^@]+)?@/, (m,p1,u) => p1+u+":***@"));
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    let Tenant;
    try {
      Tenant = mongoose.model('Tenant');
    } catch (e) {
      const TenantSchema = require('../models/Tenant');
      Tenant = mongoose.model('Tenant', TenantSchema);
    }

    const count = await Tenant.countDocuments();
    console.log('Tenant count:', count);

    const docs = await Tenant.find({}).limit(5).lean();
    console.log('Sample tenants (up to 5):');
    console.dir(docs, { depth: 4 });

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error querying tenants:', err.message);
    process.exit(1);
  }
})();
