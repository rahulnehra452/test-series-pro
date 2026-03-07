import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/lib/papaparse/**",
    "src/lib/papaparse.js",
    "src/lib/xlsx/**",
    "src/lib/xlsx.js",
    "src/lib/react-dropzone/**",
    "src/lib/file-selector/**",
    "src/lib/attr-accept/**",
    "src/lib/prop-types/**",
    "test.js",
    "temp_script/**",
  ]),
]);

export default eslintConfig;
