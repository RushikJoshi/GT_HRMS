export const MODULE_CODES = [
  'hr',
  'payroll',
  'attendance',
  'leave',
  'recruitment',
  'backgroundVerification',
  'documentManagement',
  'socialMediaIntegration',
  'employeePortal'
];

export const MODULE_DEPENDENCIES = {
  leave: ['hr'],
  backgroundVerification: ['hr'],
  documentManagement: ['hr'],
  employeePortal: ['hr']
};

const LEGACY_TO_CANONICAL = {
  ess: 'employeePortal',
  socialMedia: 'socialMediaIntegration',
  socialmedia: 'socialMediaIntegration'
};

export function normalizeModuleCode(code) {
  const c = String(code || '').trim();
  const lower = c.toLowerCase();
  if (!c) return null;
  if (MODULE_CODES.includes(c)) return c;
  return LEGACY_TO_CANONICAL[c] || LEGACY_TO_CANONICAL[lower] || null;
}

export function createDefaultEnabledModules(defaultValue = false, moduleCodes = MODULE_CODES) {
  return moduleCodes.reduce((acc, key) => {
    acc[key] = defaultValue;
    return acc;
  }, {});
}

export function normalizeEnabledModules(input = {}, legacyModules = []) {
  const out = createDefaultEnabledModules(false);

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    Object.entries(input).forEach(([key, value]) => {
      const normalizedKey = normalizeModuleCode(key);
      if (normalizedKey) out[normalizedKey] = value === true;
    });
  }

  if (Array.isArray(legacyModules)) {
    legacyModules.forEach((m) => {
      const normalizedKey = normalizeModuleCode(m);
      if (normalizedKey) out[normalizedKey] = true;
    });
  }

  return applyModuleDependencies(out);
}

export function applyModuleDependencies(enabledModules = {}) {
  const out = { ...createDefaultEnabledModules(false), ...enabledModules };
  let changed = true;

  while (changed) {
    changed = false;
    Object.entries(MODULE_DEPENDENCIES).forEach(([moduleKey, deps]) => {
      if (out[moduleKey] === true) {
        deps.forEach((dep) => {
          if (out[dep] !== true) {
            out[dep] = true;
            changed = true;
          }
        });
      }
    });
  }

  return out;
}

export function enabledModulesToArray(enabledModules = {}) {
  return MODULE_CODES.filter((key) => enabledModules?.[key] === true);
}

export function countEnabledModules(enabledModules = {}) {
  return enabledModulesToArray(enabledModules).length;
}
