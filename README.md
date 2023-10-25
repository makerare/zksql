# zkSQL interpreter based on Aleo

## Install

```bash
npm install
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
