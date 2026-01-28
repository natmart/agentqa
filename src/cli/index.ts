/**
 * AgentQA CLI Module Exports
 */

export { runInitWizard, detectProject, generateConfig, generateCIWorkflow } from './init.js';
export type { ProjectInfo, InitOptions } from './init.js';

export { runDoctor, formatDoctorReport } from './doctor.js';
export type { DiagnosticResult, DoctorReport } from './doctor.js';

export { templates, getTemplate, getTemplateByTypeAndFramework, listTemplates } from './templates.js';
export type { ConfigTemplate } from './templates.js';
