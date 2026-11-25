import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const runtimeDirectory = fileURLToPath(new URL('../', import.meta.url));
const profileDirectory = new URL('../config/', import.meta.url).href;
const port = process.env.SCHEDULER_E2E_PORT;

if (!port || !/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535 || Number(port) === 8080) {
  throw new Error('Set SCHEDULER_E2E_PORT to an isolated test port.');
}

const mavenArgs = ['-q', '-DskipTests', 'package'];
const build = process.platform === 'win32'
  ? spawnSync('cmd.exe', ['/d', '/c', 'mvnw.cmd', ...mavenArgs], { cwd: root, stdio: 'inherit' })
  : spawnSync('./mvnw', mavenArgs, { cwd: root, stdio: 'inherit' });

if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

// Exclude inherited Spring, server and JVM settings so the test process uses the isolated profile.
const serverEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
  !/^(SPRING[_.]|SERVER[_.]|JDK_JAVA_OPTIONS$|JAVA_TOOL_OPTIONS$|_JAVA_OPTIONS$)/i.test(name),
));

const server = spawn('java', [
  '-jar', join(root, 'target', 'scheduler-0.0.1-SNAPSHOT.jar'),
  '--spring.profiles.active=e2e',
  `--spring.config.location=classpath:/application.properties,${profileDirectory}`,
  '--spring.datasource.url=jdbc:h2:mem:scheduler-e2e;DB_CLOSE_DELAY=-1',
  '--spring.jpa.hibernate.ddl-auto=create-drop',
  '--server.address=127.0.0.1',
  `--server.port=${port}`,
], { cwd: runtimeDirectory, env: serverEnvironment, stdio: 'inherit' });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal));
}
server.on('error', error => {
  console.error(error);
  process.exitCode = 1;
});
server.on('exit', code => {
  process.exitCode = code ?? 0;
});
