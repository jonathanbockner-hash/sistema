import pexpect
import sys

child = pexpect.spawn('pnpm drizzle-kit generate', cwd='/home/ubuntu/time-ops', timeout=60, encoding='utf-8')
child.logfile_read = sys.stdout

for _ in range(10):
    try:
        idx = child.expect(['create column', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
        if idx == 1:
            print("\n[EOF reached]")
            break
        elif idx == 2:
            print("\n[TIMEOUT - no more prompts]")
            break
        else:
            print(f"\n[Selecting 'create column']")
            child.sendline('')
    except Exception as e:
        print(f"\n[Exception: {e}]")
        break

try:
    child.wait()
except Exception:
    pass

print("\nDone!")
