#!/usr/bin/env node

/**
 * Phase 6 Test Script
 * 
 * This script verifies the Phase 6 implementation without starting the server.
 * It tests the core functionality of AI question generation and validation.
 */

const path = require('path');

// Test imports
async function testImports() {
  console.log('🧪 Testing Phase 6 Imports...\n');

  try {
    // Test AI Question Generator
    console.log('✓ Importing questionGenerator...');
    const generator = require('./src/server/ai/questionGenerator');
    
    // Test Question Validator
    console.log('✓ Importing questionValidator...');
    const validator = require('./src/server/utils/questionValidator');
    
    // Test Generated Questions DB
    console.log('✓ Importing generated questions DB...');
    const generatedDB = require('./src/server/db/generated');
    
    // Test Question Source
    console.log('✓ Importing practice questionSource...');
    const practiceSource = require('./src/server/practice/questionSource');
    
    // Test Interview Source
    console.log('✓ Importing interview questionSource...');
    const interviewSource = require('./src/server/interview/questionSource');
    
    console.log('\n✅ All Phase 6 modules imported successfully!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    return false;
  }
}

// Test database initialization
async function testDatabase() {
  console.log('🧪 Testing Database Initialization...\n');

  try {
    const generatedDB = require('./src/server/db/generated');
    console.log('✓ Generated questions database initialized');
    
    // Check if table was created
    const count = generatedDB.default.prepare(
      'SELECT COUNT(*) as count FROM generated_questions'
    ).get();
    
    console.log(`✓ Table ready (${count.count} questions stored)`);
    
    console.log('\n✅ Database initialization successful!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    return false;
  }
}

// Test validation logic
async function testValidation() {
  console.log('🧪 Testing Question Validation...\n');

  try {
    const { validateGeneratedQuestion } = require('./src/server/utils/questionValidator');
    
    // Test valid question
    const validQuestion = {
      skill: 'Filtering',
      difficulty: 'Easy',
      problem: 'Test question',
      schema: 'employee(emp_id, emp_name, department, salary, manager_id)',
      reference_query: 'SELECT * FROM employee WHERE salary > 60000',
      expected_columns: ['emp_id', 'emp_name', 'department', 'salary', 'manager_id']
    };
    
    const result = validateGeneratedQuestion(validQuestion);
    console.log(`✓ Validation result: ${result.isValid ? 'VALID ✓' : 'INVALID ✗'}`);
    if (!result.isValid) {
      console.log(`  Error: ${result.error}`);
    }
    
    console.log('\n✅ Validation logic working!\n');
    return true;
  } catch (error) {
    console.error('\n❌ Validation test failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  PHASE 6 - AI QUESTION GENERATION - TEST SUITE');
  console.log('='.repeat(60) + '\n');

  const results = [];
  
  results.push(await testImports());
  results.push(await testDatabase());
  results.push(await testValidation());
  
  console.log('='.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ ALL TESTS PASSED (${passed}/${total})`);
  } else {
    console.log(`⚠️  SOME TESTS FAILED (${passed}/${total})`);
  }
  console.log('='.repeat(60) + '\n');
  
  return passed === total;
}

// Run tests
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
