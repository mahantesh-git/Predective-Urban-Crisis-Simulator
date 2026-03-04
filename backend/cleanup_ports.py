import os
import subprocess
import signal

def kill_on_port(port):
    print(f"Checking port {port}...")
    try:
        output = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
        for line in output.splitlines():
            if "LISTENING" in line:
                pid = line.strip().split()[-1]
                print(f"Killing process {pid} on port {port}...")
                subprocess.run(f"taskkill /F /PID {pid}", shell=True)
    except subprocess.CalledProcessError:
        print(f"Port {port} is free.")

def kill_process_by_name(name):
    print(f"Killing all processes with name {name}...")
    subprocess.run(f"taskkill /F /IM {name}*", shell=True)

# Kill everything
kill_on_port(5000)
kill_on_port(8001)
kill_on_port(5173)
kill_process_by_name("node")
kill_process_by_name("python") # Be careful, but we want to reset the ML service too.
