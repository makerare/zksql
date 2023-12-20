from random import randint
from subprocess import run, DEVNULL
import json


with open("group_to_u16.json", "r") as f:
    group_to_u16 = json.loads(f.read())


def run_snarkvm_command(command):
    res = run(command, shell=True, capture_output=True)
    stdout = res.stdout.decode()
    stderr = res.stderr.decode()
    is_err = "⚠️" in stdout
    if stderr.strip():
        print(stderr)
    if is_err:
        raise Exception(f"Error: {stdout}")
    else:
        return stdout


def random_field():
    i_val = randint(
        0, 8444461749428370424248824938781546531375899335154063827935233455917409239041
    )
    return f"{i_val}field"


def random_scalar():
    i_val = randint(
        0, 2111115437357092606062206234695386632838870926408408195193685246394721360383
    )
    return f"{i_val}scalar"


def get_command_h_egec_encrypt_u64(u64, pk):
    encryption_pads = [random_scalar() for _ in range(8)]
    encryption_pads_str = ",".join(encryption_pads)
    return (
        "snarkvm run h_egec_encrypt_u64 \\\n"
        f"{u64}u64 \\\n"
        f"{pk} \\\n"
        f"[{encryption_pads_str}]"
    )


def get_command_sum_encrypted_u64(u64_enc_1, u64_enc_2):
    return (
        "snarkvm run test_sum_encrypted_u64 \\\n"
        f'"{u64_enc_1}" \\\n'
        f'"{u64_enc_2}" \\\n'
    )


def get_command_h_egec_decrypt_u64(u64_enc, sk):
    return "snarkvm run h_egec_decrypt_u64 \\\n" f'"{u64_enc}" \\\n' f"{sk} \\\n"


def h_egec_encrypt_u64(u64, pk):
    command = get_command_h_egec_encrypt_u64(u64, pk)
    output = run_snarkvm_command(command)
    res = "".join(output.split("\n")[7:42])
    res_no_white = "".join(res.split())[1:]
    return res_no_white


def decode_u64_encoded_group(group):
    u16 = group_to_u16[group]
    return u16


def decode_u64_encoded_groups(u64_enc):
    s = 0
    for i, group in enumerate(u64_enc[1:-1].split(",")):
        b = decode_u64_encoded_group(group[:-5])
        s += b * 256**i
    return s


def h_egec_decrypt_u64(u64_enc, sk):
    command = get_command_h_egec_decrypt_u64(u64_enc, sk)
    output = run_snarkvm_command(command)

    res = "".join(output.split("\n")[7:18])
    res_no_white = "".join(res.split())[1:]

    decoded = decode_u64_encoded_groups(res_no_white)

    # group_to_u16
    return decoded


def test_sum_encrypted_u64(u64_enc_1, u64_enc_2):
    command = get_command_sum_encrypted_u64(u64_enc_1, u64_enc_2)
    output = run_snarkvm_command(command)
    res = "".join(output.split("\n")[7:42])
    res_no_white = "".join(res.split())[1:]
    return res_no_white


def main():
    u64_1 = 18446744073709551615
    u64_2 = 18446744073709551615
    sk = "13296454265428133247701839510667931384113428011279732551851164090875048569scalar"
    pk = "5145722781245840175376194463372868162304447518999913078854806464397799828012group"

    u64_1_encrypted = h_egec_encrypt_u64(u64_1, pk)
    u64_2_encrypted = h_egec_encrypt_u64(u64_2, pk)

    u64_1_decrypted = h_egec_decrypt_u64(u64_1_encrypted, sk)
    u64_2_decrypted = h_egec_decrypt_u64(u64_2_encrypted, sk)

    print()
    print()
    print()

    print(
        f"u64_1: {u64_1}\n"
        f"u64_1_encrypted: {u64_1_encrypted}\n"
        f"u64_1_decrypted: {u64_1_decrypted}"
    )
    print()
    print(
        f"u64_2: {u64_2}\n"
        f"u64_2_encrypted: {u64_2_encrypted}\n"
        f"u64_2_decrypted: {u64_2_decrypted}"
    )
    print()
    print()

    sum_encrypted = test_sum_encrypted_u64(u64_1_encrypted, u64_2_encrypted)
    sum_decrypted = h_egec_decrypt_u64(sum_encrypted, sk)

    print(f"sum_encrypted: {sum_encrypted}\n" f"sum_decrypted: {sum_decrypted}")

    print()
    print()
    print()

    sum_encrypted = h_egec_encrypt_u64(0, pk)

    for i in range(300):
        u64_encrypted = h_egec_encrypt_u64(u64_1, pk)
        sum_encrypted = test_sum_encrypted_u64(sum_encrypted, u64_encrypted)
        sum_decrypted = h_egec_decrypt_u64(sum_encrypted, sk)

        print(f"{i}: {sum_decrypted} ; {sum_decrypted == u64_1 * (i + 1)}")


if __name__ == "__main__":
    main()
