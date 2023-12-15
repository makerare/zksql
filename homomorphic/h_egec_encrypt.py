from random import randint
from subprocess import run, DEVNULL

def random_field():
    i_val = randint(0, 8444461749428370424248824938781546531375899335154063827935233455917409239041)
    return f'{i_val}field'

def random_scalar():
    i_val = randint(0, 2111115437357092606062206234695386632838870926408408195193685246394721360383)
    return f'{i_val}scalar'


def get_inputs(u64, pk, encoding_pad, encryption_pad):
    encoding_pad = f"{encoding_pad}field"
    return (
        "snarkvm run egec_encrypt_u64 \\\n"
        f"{u64}u64 \\\n"
        f"{encoding_pad} \\\n"
        f"{pk} \\\n"
        f"{encryption_pad}"
    )


MAX_ERROR_AMOUNT = 5

def main():
    u64 = 123456
    sk = "13296454265428133247701839510667931384113428011279732551851164090875048569scalar"
    pk = "5145722781245840175376194463372868162304447518999913078854806464397799828012group"
    encryption_pad = "165928923989395460875060978802347429963935659618372420522020033947807816951scalar"
    encoding_pad = 0
    err_amount = 0

    while True:
        command = get_inputs(u64, pk, encoding_pad, encryption_pad)
        res = run(command, shell=True, capture_output = True)
        stdout = res.stdout.decode()
        stderr = res.stderr.decode()
        is_err = "⚠️" in stdout
        if is_err and "is not satisfied on the given inputs" in stdout:
            err_amount = 0
            encoding_pad += 1
            continue
        if is_err:
            err_amount += 1
            if err_amount > MAX_ERROR_AMOUNT:
                print(command)
                print("")
                print(stdout)
                print("Too many errors, exiting")
                break
            continue
        print(command)
        print("")
        print(stdout)
        break

if __name__ == "__main__":
    main()