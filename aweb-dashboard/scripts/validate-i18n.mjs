#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

const repoRoot = path.resolve(process.cwd(), "..");

const TARGETS = {
  web: {
    label: "web-dashboard",
    filePath: path.join(repoRoot, "aweb-dashboard", "src", "lib", "i18n.ts"),
  },
  mobile: {
    label: "mobile-app",
    filePath: path.join(repoRoot, "mobile-app", "lib", "i18n.tsx"),
  },
};

function parseArgs(argv) {
  const targetArgIndex = argv.findIndex((arg) => arg === "--target");
  if (targetArgIndex === -1) return "all";
  const value = argv[targetArgIndex + 1];
  if (!value) {
    throw new Error("Missing value for --target. Use one of: web, mobile, all");
  }
  if (!["web", "mobile", "all"].includes(value)) {
    throw new Error(
      `Invalid --target value '${value}'. Use one of: web, mobile, all`,
    );
  }
  return value;
}

function loadSource(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function collectObjectLiteralDeclarations(sourceFile) {
  const objectLiterals = new Map();

  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      if (ts.isObjectLiteralExpression(node.initializer)) {
        objectLiterals.set(node.name.text, node.initializer);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return objectLiterals;
}

function extractDictionaryMapping(dictionariesObject) {
  const mapping = new Map();
  for (const prop of dictionariesObject.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;
    const keyName =
      ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)
        ? prop.name.text
        : null;
    if (!keyName) continue;
    if (!ts.isIdentifier(prop.initializer)) continue;
    mapping.set(keyName, prop.initializer.text);
  }
  return mapping;
}

function resolveObjectLiteral(name, objectLiterals, cache, stack = []) {
  if (cache.has(name)) {
    return cache.get(name);
  }

  if (stack.includes(name)) {
    throw new Error(
      `Circular dictionary spread detected: ${[...stack, name].join(" -> ")}`,
    );
  }

  const literal = objectLiterals.get(name);
  if (!literal) {
    throw new Error(`Dictionary object '${name}' was not found.`);
  }

  const resolved = new Map();

  for (const prop of literal.properties) {
    if (ts.isSpreadAssignment(prop)) {
      if (!ts.isIdentifier(prop.expression)) {
        throw new Error(
          `Unsupported spread expression in '${name}'. Use spread from named dictionary constants only.`,
        );
      }
      const spreadName = prop.expression.text;
      const spreadResolved = resolveObjectLiteral(
        spreadName,
        objectLiterals,
        cache,
        [...stack, name],
      );
      for (const [k, v] of spreadResolved.entries()) {
        resolved.set(k, v);
      }
      continue;
    }

    if (!ts.isPropertyAssignment(prop)) {
      continue;
    }

    const key =
      ts.isStringLiteral(prop.name) ||
      ts.isNoSubstitutionTemplateLiteral(prop.name)
        ? prop.name.text
        : ts.isIdentifier(prop.name)
          ? prop.name.text
          : null;

    if (!key) {
      continue;
    }

    if (
      ts.isStringLiteral(prop.initializer) ||
      ts.isNoSubstitutionTemplateLiteral(prop.initializer)
    ) {
      resolved.set(key, prop.initializer.text);
      continue;
    }

    if (ts.isTemplateExpression(prop.initializer)) {
      let text = prop.initializer.head.text;
      for (const span of prop.initializer.templateSpans) {
        text += `\${${span.expression.getText()}}${span.literal.text}`;
      }
      resolved.set(key, text);
      continue;
    }

    resolved.set(key, prop.initializer.getText());
  }

  cache.set(name, resolved);
  return resolved;
}

function extractPlaceholders(value) {
  const matches = value.match(/\{\{\s*[a-zA-Z0-9_.]+\s*\}\}/g) || [];
  return new Set(matches.map((m) => m.replace(/\s+/g, "")));
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function hasIndicScript(value) {
  return /[\p{Script=Devanagari}\p{Script=Tamil}\p{Script=Gujarati}]/u.test(
    value,
  );
}

function analyzeTarget(targetConfig) {
  const sourceText = loadSource(targetConfig.filePath);
  const sourceFile = ts.createSourceFile(
    targetConfig.filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    targetConfig.filePath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );

  const objectLiterals = collectObjectLiteralDeclarations(sourceFile);
  const dictionariesLiteral = objectLiterals.get("DICTIONARIES");
  if (!dictionariesLiteral) {
    throw new Error(
      `DICTIONARIES object not found in ${targetConfig.filePath}`,
    );
  }

  const languageToObject = extractDictionaryMapping(dictionariesLiteral);
  if (!languageToObject.has("en")) {
    throw new Error(
      `English dictionary mapping 'en' not found in DICTIONARIES in ${targetConfig.filePath}`,
    );
  }

  const cache = new Map();
  const resolvedByLanguage = new Map();

  for (const [langCode, objectName] of languageToObject.entries()) {
    resolvedByLanguage.set(
      langCode,
      resolveObjectLiteral(objectName, objectLiterals, cache),
    );
  }

  const base = resolvedByLanguage.get("en");
  const issues = [];
  const warnings = [];

  for (const [langCode, dict] of resolvedByLanguage.entries()) {
    const baseKeys = new Set(base.keys());
    const dictKeys = new Set(dict.keys());

    const missingKeys = [...baseKeys].filter((k) => !dictKeys.has(k));
    const extraKeys = [...dictKeys].filter((k) => !baseKeys.has(k));

    if (missingKeys.length > 0) {
      issues.push({
        type: "missing_keys",
        langCode,
        items: missingKeys,
      });
    }

    if (extraKeys.length > 0) {
      warnings.push({
        type: "extra_keys",
        langCode,
        items: extraKeys,
      });
    }

    for (const key of baseKeys) {
      if (!dict.has(key)) continue;
      const basePlaceholders = extractPlaceholders(base.get(key) || "");
      const localPlaceholders = extractPlaceholders(dict.get(key) || "");
      if (!setsEqual(basePlaceholders, localPlaceholders)) {
        issues.push({
          type: "placeholder_mismatch",
          langCode,
          key,
          base: [...basePlaceholders],
          local: [...localPlaceholders],
        });
      }
    }
  }

  for (const [key, value] of base.entries()) {
    if (hasIndicScript(value)) {
      issues.push({
        type: "mixed_language_english",
        langCode: "en",
        key,
        value,
      });
    }
  }

  return {
    target: targetConfig.label,
    filePath: targetConfig.filePath,
    languages: [...resolvedByLanguage.keys()],
    keyCount: base.size,
    issues,
    warnings,
  };
}

function printReport(report) {
  console.log(`\nI18N Report: ${report.target}`);
  console.log(`File: ${report.filePath}`);
  console.log(`Languages: ${report.languages.join(", ")}`);
  console.log(`Base key count (en): ${report.keyCount}`);

  if (report.issues.length === 0) {
    console.log("Errors: none");
  } else {
    console.log(`Errors: ${report.issues.length}`);
    for (const issue of report.issues) {
      if (issue.type === "missing_keys") {
        console.log(
          `  - [${issue.langCode}] Missing keys (${issue.items.length}): ${issue.items.slice(0, 8).join(", ")}${issue.items.length > 8 ? " ..." : ""}`,
        );
      } else if (issue.type === "placeholder_mismatch") {
        console.log(
          `  - [${issue.langCode}] Placeholder mismatch at '${issue.key}'`,
        );
        console.log(`      base:  ${issue.base.join(", ") || "(none)"}`);
        console.log(`      local: ${issue.local.join(", ") || "(none)"}`);
      } else if (issue.type === "mixed_language_english") {
        console.log(`  - [en] Mixed-language value at '${issue.key}'`);
      }
    }
  }

  if (report.warnings.length === 0) {
    console.log("Warnings: none");
  } else {
    console.log(`Warnings: ${report.warnings.length}`);
    for (const warning of report.warnings.slice(0, 10)) {
      if (warning.type === "extra_keys") {
        console.log(
          `  - [${warning.langCode}] Extra keys (${warning.items.length}): ${warning.items.slice(0, 8).join(", ")}${warning.items.length > 8 ? " ..." : ""}`,
        );
      }
    }
    if (report.warnings.length > 10) {
      console.log(`  ... ${report.warnings.length - 10} more warnings`);
    }
  }
}

function main() {
  const target = parseArgs(process.argv.slice(2));
  const targetConfigs =
    target === "all" ? [TARGETS.web, TARGETS.mobile] : [TARGETS[target]];

  const reports = targetConfigs.map(analyzeTarget);
  reports.forEach(printReport);

  const totalIssues = reports.reduce((sum, r) => sum + r.issues.length, 0);
  if (totalIssues > 0) {
    console.error(`\nI18N validation failed with ${totalIssues} error(s).`);
    process.exit(1);
  }

  console.log("\nI18N validation passed.");
}

try {
  main();
} catch (error) {
  console.error("I18N validation failed due to runtime error:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
