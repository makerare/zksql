# zkSQL interpreter based on Aleo

## Install

```bash
npm install
```

## Insert row

```bash
node . execute "\
INSERT INTO disperse_multi_method \
  (addr,nbr,fld) \
VALUES \
  (\
    'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc',\
    'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc',\
    'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc'\
  )"
```

## Left to implement

- CREATE TABLE
- SELECT
- DELETE
- JOIN
