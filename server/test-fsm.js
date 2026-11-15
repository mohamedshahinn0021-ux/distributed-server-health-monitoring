import { evaluateFSM, FSM_STATES } from './services/fsmService.js';
import { validateHealthCheckUrl, isPrivateIP } from './utils/validator.js';

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE FSM & SECURITY UNIT TESTS');
console.log('====================================================');

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// TEST SUITE 1: SSRF Protection & URL Validation
// ----------------------------------------------------
console.log('\n--- 1. Security & SSRF Protection Tests ---');

assert(isPrivateIP('127.0.0.1') === true, '127.0.0.1 recognized as private/loopback');
assert(isPrivateIP('10.0.1.5') === true, '10.0.1.5 recognized as private RFC 1918');
assert(isPrivateIP('172.16.5.10') === true, '172.16.5.10 recognized as private RFC 1918');
assert(isPrivateIP('192.168.1.1') === true, '192.168.1.1 recognized as private RFC 1918');
assert(isPrivateIP('169.254.169.254') === true, '169.254.169.254 recognized as AWS/GCP metadata IP');
assert(isPrivateIP('8.8.8.8') === false, '8.8.8.8 recognized as public IP');
assert(isPrivateIP('1.1.1.1') === false, '1.1.1.1 recognized as public IP');

const mockValidation = validateHealthCheckUrl('http://localhost:5000/api/mock/fast');
assert(mockValidation.valid === true && mockValidation.isMock === true, 'Safe built-in mock endpoint permitted');

const ssrfValidation = validateHealthCheckUrl('http://169.254.169.254/latest/meta-data/');
assert(ssrfValidation.valid === false, 'AWS/Cloud metadata SSRF endpoint blocked');

const internalValidation = validateHealthCheckUrl('http://192.168.1.100/admin');
assert(internalValidation.valid === false, 'Internal RFC 1918 private network endpoint blocked');

const ftpValidation = validateHealthCheckUrl('ftp://example.com/health');
assert(ftpValidation.valid === false, 'Non-HTTP/HTTPS protocol (FTP) rejected');

const validPublic = validateHealthCheckUrl('https://api.github.com');
assert(validPublic.valid === true, 'Valid public HTTPS URL approved');

// ----------------------------------------------------
// TEST SUITE 2: Finite-State Machine (FSM) Transitions
// ----------------------------------------------------
console.log('\n--- 2. FSM State Transition Engine Tests ---');

const serverMock = {
  _id: 'test_server_1',
  name: 'Test Node',
  currentState: FSM_STATES.ACTIVE,
  responseThreshold: 500,
  failureThreshold: 2,
  recoveryThreshold: 2,
  consecutiveFailures: 0,
  consecutiveSuccesses: 5,
};

// 1. Normal response keeps state ACTIVE
const res1 = evaluateFSM(serverMock, {
  isConnected: true,
  responseTime: 120,
  statusCode: 200,
});
assert(res1.newState === FSM_STATES.ACTIVE && !res1.transitioned, 'Normal latency (120ms < 500ms) preserves ACTIVE state');

// 2. High latency transitions ACTIVE -> SLOW
const res2 = evaluateFSM(serverMock, {
  isConnected: true,
  responseTime: 850,
  statusCode: 200,
});
assert(res2.newState === FSM_STATES.SLOW && res2.transitioned, 'High latency (850ms > 500ms) transitions ACTIVE -> SLOW');

// 3. Normal latency transitions SLOW -> ACTIVE
const serverSlow = { ...serverMock, currentState: FSM_STATES.SLOW };
const res3 = evaluateFSM(serverSlow, {
  isConnected: true,
  responseTime: 200,
  statusCode: 200,
});
assert(res3.newState === FSM_STATES.ACTIVE && res3.transitioned, 'Latency normalization (200ms < 500ms) transitions SLOW -> ACTIVE');

// 4. Single failure does not disconnect immediately (anti-flapping filter)
const res4 = evaluateFSM(serverMock, {
  isConnected: false,
  responseTime: 0,
  statusCode: null,
  errorMessage: 'Timeout',
});
assert(res4.newState === FSM_STATES.ACTIVE && !res4.transitioned && res4.consecutiveFailures === 1, '1st failure increments counter without flapping to DISCONNECTED');

// 5. Repeated failure (>= failureThreshold 2) transitions to DISCONNECTED
const serverWith1Fail = { ...serverMock, consecutiveFailures: 1 };
const res5 = evaluateFSM(serverWith1Fail, {
  isConnected: false,
  responseTime: 0,
  statusCode: null,
  errorMessage: 'Connection Refused',
});
assert(res5.newState === FSM_STATES.DISCONNECTED && res5.transitioned, '2nd consecutive failure transitions to DISCONNECTED');

// 6. First successful check from DISCONNECTED transitions to RECOVERING
const serverDisconnected = { ...serverMock, currentState: FSM_STATES.DISCONNECTED, consecutiveFailures: 4 };
const res6 = evaluateFSM(serverDisconnected, {
  isConnected: true,
  responseTime: 150,
  statusCode: 200,
});
assert(res6.newState === FSM_STATES.RECOVERING && res6.transitioned && res6.consecutiveSuccesses === 1, 'First successful check transitions DISCONNECTED -> RECOVERING');

// 7. Verification stage in RECOVERING: 1st success stays RECOVERING
const serverRecovering1 = { ...serverMock, currentState: FSM_STATES.RECOVERING, consecutiveSuccesses: 1 };
const res7 = evaluateFSM(serverRecovering1, {
  isConnected: true,
  responseTime: 140,
  statusCode: 200,
});
assert(res7.newState === FSM_STATES.ACTIVE && res7.transitioned, '2nd consecutive check completes verification and transitions RECOVERING -> ACTIVE');

// 8. Failure during recovery immediately aborts back to DISCONNECTED
const serverRecoveringFail = { ...serverMock, currentState: FSM_STATES.RECOVERING, consecutiveSuccesses: 1 };
const res8 = evaluateFSM(serverRecoveringFail, {
  isConnected: false,
  responseTime: 0,
  statusCode: null,
  errorMessage: 'Network drop during verification',
});
assert(res8.newState === FSM_STATES.DISCONNECTED && res8.transitioned, 'Failure during recovery aborts back to DISCONNECTED');

console.log('====================================================');
console.log(`Results: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
