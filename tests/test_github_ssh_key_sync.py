"""Exercise the helper emitted by the installer without changing the host."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest


class GitHubKeySyncTest(unittest.TestCase):
    def test_generated_helper(self):
        script = (Path(__file__).resolve().parents[1] / 'docs/systemscripts/debian-13-x86_64/configure-github-ssh-access.sh').read_text()
        helper = script.split('"$sync_helper" <<\'EOF\'\n', 1)[1].split('\nEOF', 1)[0]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.ssh').mkdir()
            (root / 'bin').mkdir()
            (root / 'helper').write_text(helper)
            (root / 'config').write_text(f"target_home='{root}'\ngithub_username='beolson'\n")
            subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', str(root / 'fixture')], check=True)
            key = (root / 'fixture.pub').read_text()
            curl = root / 'bin/curl'
            curl.write_text('''#!/usr/bin/env python3
import os, sys
expected = ['--fail', '--location', '--silent', '--show-error', '--proto', '=https', '--tlsv1.2', '--max-time', '30', 'https://github.com/beolson.keys']
if sys.argv[1:] != expected:
    print('curl: (3) URL rejected: Bad hostname', file=sys.stderr)
    sys.exit(3)
sys.stdout.write(os.environ['KEY_RESPONSE'])
sys.exit(int(os.environ['CURL_EXIT']))
''')
            curl.chmod(0o755)
            authorized = root / '.ssh/authorized_keys'
            env = dict(os.environ, PATH=f"{root / 'bin'}:{os.environ['PATH']}")
            for label, response, exit_code, succeeds in [
                ('valid', key, 0, True),
                ('empty', '', 0, False),
                ('invalid', 'not an SSH key\n', 0, False),
                ('failed partial download', key, 22, False),
            ]:
                with self.subTest(label=label):
                    authorized.write_text('existing-key\n')
                    result = subprocess.run(['bash', str(root / 'helper'), str(root / 'config')], env=dict(env, KEY_RESPONSE=response, CURL_EXIT=str(exit_code)), capture_output=True, text=True)
                    self.assertNotIn('Bad hostname', result.stderr)
                    self.assertEqual(result.returncode == 0, succeeds, result.stderr)
                    self.assertEqual(authorized.read_text(), key if succeeds else 'existing-key\n')
                    self.assertEqual(list((root / '.ssh').glob('.authorized_keys.github.*')), [])
                    if succeeds:
                        self.assertEqual(authorized.stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
