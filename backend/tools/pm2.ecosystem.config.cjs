/** PM2 — aSK Youth Python microservices (run: pm2 start pm2.ecosystem.config.cjs) */
const PYDIR = __dirname;

module.exports = {
  apps: [
    { name: 'sk-router',     script: 'tool_router.py',         cwd: PYDIR, interpreter: 'python', args: '--serve --port 5000' },
    { name: 'sk-docgen',     script: 'document_generator.py',  cwd: PYDIR, interpreter: 'python', args: '--serve --port 5001' },
    { name: 'sk-budget',     script: 'budget_estimator.py',      cwd: PYDIR, interpreter: 'python', args: '--serve --port 5002' },
    { name: 'sk-attendance', script: 'attendance_exporter.py',   cwd: PYDIR, interpreter: 'python', args: '--serve --port 5003' },
    { name: 'sk-narrative',  script: 'narrative_compiler.py',    cwd: PYDIR, interpreter: 'python', args: '--serve --port 5004' },
    { name: 'sk-summary',    script: 'summary_generator.py',     cwd: PYDIR, interpreter: 'python', args: '--serve --port 5005' },
    { name: 'sk-context',    script: 'context_manager.py',       cwd: PYDIR, interpreter: 'python', args: '--serve --port 5007' },
    { name: 'sk-language',   script: 'language_corrector.py',    cwd: PYDIR, interpreter: 'python', args: '--serve --port 5008' },
  ],
};
