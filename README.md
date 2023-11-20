# zkSQL interpreter based on Aleo

## Install

```bash
npm install
```

## Environment variables

Duplicate `.env.local.example` file and rename it to `.env.local`.
Update it with your own Aleo private key.

## Create Table

```bash
node . execute "\
CREATE TABLE first_table \
  (column1 INT, column2 BOOLEAN) \
"
```

## Insert row

```bash
node . execute "\
INSERT INTO first_table \
  (column1, column2) \
VALUES \
  (\
    1,\
    true
  )\
"
```

## Implemented

- CREATE TABLE
- INSERT

## Left to implement

- SELECT
- DELETE
- JOIN
- UPDATE
- INSERT TABLE
