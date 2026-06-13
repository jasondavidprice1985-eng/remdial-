import '@testing-library/jest-dom';

/* Default all components to SAP-decoder disabled (manual input fields).
   Override per-test with vi.stubEnv when testing SAP features. */
process.env.VITE_SAP_DECODER_ENABLED = 'false';
