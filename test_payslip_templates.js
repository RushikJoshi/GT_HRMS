const mongoose = require('mongoose');
require('dotenv').config();

const getTenantDB = require('./backend/utils/tenantDB');

async function testPayslipTemplates() {
    try {
        console.log('🔍 Testing Payslip Templates...\n');

        // Connect to main DB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms-saas';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to main MongoDB\n');

        // Get first tenant
        const Tenant = mongoose.model('Tenant');
        const tenant = await Tenant.findOne().select('_id code name');
        
        if (!tenant) {
            console.log('❌ No tenant found in database');
            process.exit(1);
        }

        console.log(`📍 Testing with tenant: ${tenant.code} (${tenant._id})\n`);

        // Get tenant database
        const tenantDB = await getTenantDB(tenant._id.toString());
        const PayslipTemplate = tenantDB.model('PayslipTemplate');

        // Count templates
        const count = await PayslipTemplate.countDocuments({ tenant: tenant._id });
        console.log(`📊 Total Templates: ${count}\n`);

        // Fetch templates
        const templates = await PayslipTemplate.find({ tenant: tenant._id })
            .sort({ isDefault: -1, createdAt: -1 });

        if (templates.length > 0) {
            console.log('✅ Templates found:');
            templates.forEach((tpl, i) => {
                console.log(`\n${i + 1}. ${tpl.name}`);
                console.log(`   - Type: ${tpl.templateType}`);
                console.log(`   - Default: ${tpl.isDefault}`);
                console.log(`   - Created: ${tpl.createdAt}`);
            });
        } else {
            console.log('⚠️  No templates found. Creating a sample template...\n');

            // Create a sample template
            const sampleTemplate = new PayslipTemplate({
                tenant: tenant._id,
                name: 'Standard Payslip',
                templateType: 'BUILDER',
                builderConfig: {
                    name: 'Standard Payslip',
                    sections: [
                        {
                            id: 'header-1',
                            type: 'company-header',
                            content: {
                                showLogo: true,
                                logoAlign: 'left',
                                companyNameSize: '24px',
                                showAddress: true
                            },
                            styles: { paddingBottom: '20px', borderBottom: '1px solid #e5e7eb' }
                        }
                    ],
                    styles: {
                        backgroundColor: '#ffffff',
                        fontFamily: 'Inter',
                        fontSize: '12px',
                        color: '#000000',
                        padding: '30px'
                    }
                },
                isActive: true,
                isDefault: true
            });

            await sampleTemplate.save();
            console.log('✅ Sample template created successfully!\n');
        }

        console.log('✅ Test completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testPayslipTemplates();
