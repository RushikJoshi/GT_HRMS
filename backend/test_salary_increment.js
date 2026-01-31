/**
 * ============================================
 * SALARY INCREMENT SYSTEM - TEST SCRIPT
 * ============================================
 * 
 * Run this script to verify the salary increment system is working correctly.
 * 
 * Usage:
 * node backend/test_salary_increment.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import service
const salaryIncrementService = require('./services/salaryIncrement.service');

// Test data
const TEST_COMPANY_ID = new mongoose.Types.ObjectId();
const TEST_EMPLOYEE_ID = new mongoose.Types.ObjectId();
const TEST_USER_ID = new mongoose.Types.ObjectId();

async function runTests() {
    console.log('🧪 Starting Salary Increment System Tests...\n');

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB\n');

        // Create test tenant DB
        const tenantDB = mongoose.connection.useDb('test_tenant_db');

        // Register models
        const EmployeeCtcVersion = tenantDB.model('EmployeeCtcVersion', require('./models/EmployeeCtcVersion'));
        const SalaryIncrement = tenantDB.model('SalaryIncrement', require('./models/SalaryIncrement'));
        const Employee = tenantDB.model('Employee', require('./models/Employee'));

        // Clean up test data
        console.log('🧹 Cleaning up test data...');
        await EmployeeCtcVersion.deleteMany({ employeeId: TEST_EMPLOYEE_ID });
        await SalaryIncrement.deleteMany({ employeeId: TEST_EMPLOYEE_ID });
        await Employee.deleteMany({ _id: TEST_EMPLOYEE_ID });
        console.log('✅ Cleanup complete\n');

        // Create test employee
        console.log('👤 Creating test employee...');
        const testEmployee = new Employee({
            _id: TEST_EMPLOYEE_ID,
            firstName: 'Test',
            lastName: 'Employee',
            employeeId: 'EMP001',
            email: 'test@example.com',
            status: 'Active',
            joiningDate: new Date('2025-01-01')
        });
        await testEmployee.save();
        console.log('✅ Test employee created\n');

        // Create initial salary (v1)
        console.log('💰 Creating initial salary (v1)...');
        const initialSalary = new EmployeeCtcVersion({
            companyId: TEST_COMPANY_ID,
            employeeId: TEST_EMPLOYEE_ID,
            version: 1,
            effectiveFrom: new Date('2025-01-01'),
            totalCTC: 1000000,
            grossA: 58333, // Monthly
            grossB: 200000, // Annual
            grossC: 100000, // Annual
            components: [],
            isActive: true,
            status: 'ACTIVE',
            createdBy: TEST_USER_ID
        });
        await initialSalary.save();
        console.log('✅ Initial salary created: ₹10,00,000\n');

        // Test 1: Create increment with future effective date
        console.log('📅 Test 1: Create increment with future effective date...');
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);

        const result1 = await salaryIncrementService.createIncrement(tenantDB, {
            employeeId: TEST_EMPLOYEE_ID,
            effectiveFrom: futureDate,
            totalCTC: 1200000,
            grossA: 70000,
            grossB: 240000,
            grossC: 120000,
            components: [],
            incrementType: 'INCREMENT',
            reason: 'Annual performance increment',
            notes: 'Test increment',
            createdBy: TEST_USER_ID,
            companyId: TEST_COMPANY_ID
        });

        console.log('   Status:', result1.status);
        console.log('   New Version:', result1.newCtcVersion.version);
        console.log('   New CTC: ₹', result1.newCtcVersion.totalCTC.toLocaleString('en-IN'));
        console.log('   Change: +₹', result1.change.absolute.toLocaleString('en-IN'), `(${result1.change.percentage}%)`);
        console.log('   isActive:', result1.newCtcVersion.isActive);

        if (result1.status === 'SCHEDULED' && !result1.newCtcVersion.isActive) {
            console.log('✅ Test 1 PASSED: Future increment is SCHEDULED and not active\n');
        } else {
            console.log('❌ Test 1 FAILED: Expected SCHEDULED status and isActive=false\n');
        }

        // Test 2: Create increment with today's date
        console.log('📅 Test 2: Create increment with today\'s date...');
        const today = new Date();

        // First, clean up the future increment
        await EmployeeCtcVersion.findByIdAndDelete(result1.newCtcVersion._id);
        await SalaryIncrement.findByIdAndDelete(result1.increment._id);

        // Reset initial salary to active
        await EmployeeCtcVersion.findByIdAndUpdate(initialSalary._id, { isActive: true });

        const result2 = await salaryIncrementService.createIncrement(tenantDB, {
            employeeId: TEST_EMPLOYEE_ID,
            effectiveFrom: today,
            totalCTC: 1200000,
            grossA: 70000,
            grossB: 240000,
            grossC: 120000,
            components: [],
            incrementType: 'INCREMENT',
            reason: 'Immediate increment',
            notes: 'Test increment',
            createdBy: TEST_USER_ID,
            companyId: TEST_COMPANY_ID
        });

        console.log('   Status:', result2.status);
        console.log('   New Version:', result2.newCtcVersion.version);
        console.log('   New CTC: ₹', result2.newCtcVersion.totalCTC.toLocaleString('en-IN'));
        console.log('   isActive:', result2.newCtcVersion.isActive);

        // Check old version is inactive
        const oldVersion = await EmployeeCtcVersion.findById(initialSalary._id);
        console.log('   Old version isActive:', oldVersion.isActive);

        if (result2.status === 'ACTIVE' && result2.newCtcVersion.isActive && !oldVersion.isActive) {
            console.log('✅ Test 2 PASSED: Today\'s increment is ACTIVE and old version is inactive\n');
        } else {
            console.log('❌ Test 2 FAILED: Expected ACTIVE status and proper version switching\n');
        }

        // Test 3: Validate salary breakup
        console.log('🧮 Test 3: Validate salary breakup...');
        try {
            salaryIncrementService.validateSalaryBreakup(1200000, 70000, 240000, 120000);
            console.log('   Breakup: (70,000 × 12) + 240,000 + 120,000 = 1,200,000');
            console.log('✅ Test 3 PASSED: Valid breakup accepted\n');
        } catch (error) {
            console.log('❌ Test 3 FAILED:', error.message, '\n');
        }

        // Test 4: Reject invalid breakup
        console.log('🧮 Test 4: Reject invalid salary breakup...');
        try {
            salaryIncrementService.validateSalaryBreakup(1200000, 50000, 200000, 100000);
            console.log('❌ Test 4 FAILED: Invalid breakup was accepted\n');
        } catch (error) {
            console.log('   Error:', error.message);
            console.log('✅ Test 4 PASSED: Invalid breakup rejected\n');
        }

        // Test 5: Get increment history
        console.log('📜 Test 5: Get increment history...');
        const history = await salaryIncrementService.getIncrementHistory(tenantDB, TEST_EMPLOYEE_ID);
        console.log('   History count:', history.length);
        console.log('   Latest increment:', history[0]?.incrementType);

        if (history.length > 0) {
            console.log('✅ Test 5 PASSED: Increment history retrieved\n');
        } else {
            console.log('❌ Test 5 FAILED: No history found\n');
        }

        // Test 6: Get current salary
        console.log('💰 Test 6: Get current active salary...');
        const currentSalary = await salaryIncrementService.getCurrentSalary(tenantDB, TEST_EMPLOYEE_ID);
        console.log('   Current CTC: ₹', currentSalary.totalCTC.toLocaleString('en-IN'));
        console.log('   Version:', currentSalary.version);
        console.log('   isActive:', currentSalary.isActive);

        if (currentSalary.isActive && currentSalary.totalCTC === 1200000) {
            console.log('✅ Test 6 PASSED: Current salary is correct\n');
        } else {
            console.log('❌ Test 6 FAILED: Current salary is incorrect\n');
        }

        // Clean up
        console.log('🧹 Cleaning up test data...');
        await EmployeeCtcVersion.deleteMany({ employeeId: TEST_EMPLOYEE_ID });
        await SalaryIncrement.deleteMany({ employeeId: TEST_EMPLOYEE_ID });
        await Employee.deleteMany({ _id: TEST_EMPLOYEE_ID });
        console.log('✅ Cleanup complete\n');

        console.log('🎉 All tests completed!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

// Run tests
runTests();
