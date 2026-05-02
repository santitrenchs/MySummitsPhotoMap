import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  { ignores: ["__tests__/**", "e2e/**", "scripts/**", ".next/**"] },
  ...coreWebVitals,
  ...typescript,
  {
    // React Compiler rules are too strict for React 18 patterns in this codebase.
    // Re-enable when upgrading to React 19 + React Compiler.
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
];

export default eslintConfig;
