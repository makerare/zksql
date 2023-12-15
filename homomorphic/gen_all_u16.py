from concurrent.futures import ThreadPoolExecutor, as_completed
from random import randint
from subprocess import run, DEVNULL
import json

MAX_ERROR_AMOUNT = 100

def run_command(i):
    command = f"snarkvm run test_h_encode_u16_to_group {i}u16"
    res = run(command, shell=True, capture_output=True)
    stdout = res.stdout.decode()
    stderr = res.stderr.decode()
    is_err = "⚠️" in stdout
    if is_err:
        return None, True
    res = int(stdout.split("\n")[7][3:-5])
    return i, res

def main():
    values = {}
    err_amount = 0
    with ThreadPoolExecutor(max_workers=18) as executor:
        future_to_command = {executor.submit(run_command, i): i for i in range(0, 2**16)}
        for future in as_completed(future_to_command):
            i, result = future.result()
            if result is None:
                err_amount += 1
                if err_amount > MAX_ERROR_AMOUNT:
                    print("Too many errors, exiting")
                    break
            else:
                print(i, ":", result)
                values[result] = i

    with open("group_to_u16.json", "w") as f:
        json.dump(values, f)

if __name__ == "__main__":
    main()