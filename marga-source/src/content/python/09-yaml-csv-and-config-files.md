---
title: Working with YAML, CSV and configuration files
minutes: 12
summary: Read and write the data formats of operations safely: YAML, CSV and INI, with validation and without surprises.
---

Infrastructure is described in files. Kubernetes manifests are YAML, exports from a spreadsheet are CSV, and older tools use INI. Python can read them all, but each has traps: YAML turns the word `no` into a boolean, CSV breaks on commas inside fields, and loading untrusted YAML the wrong way can run code.

## What you will learn

- Parse YAML with safe_load and understand type surprises
- Use the csv module instead of splitting on commas
- Read INI-style files with configparser
- Validate what you read before you use it

## YAML: always safe_load

YAML is not in the standard library; install PyYAML. Always use `safe_load`, which only builds plain data. The plain `load` function can create arbitrary Python objects from a crafted file.

```python
import yaml

with open("deploy.yaml") as f:
    data = yaml.safe_load(f)

replicas = data["spec"]["replicas"]
```

Watch the type rules. Unquoted `no`, `off` and `yes` become booleans in YAML 1.1, so a country code `NO` can turn into `False`. A version such as `1.10` becomes the number 1.1. Quote strings that must stay text, and write files with `yaml.safe_dump(data, sort_keys=False)` to keep key order.

## CSV: use the module

Splitting a line on commas breaks as soon as a value contains a comma or a quote. The `csv` module handles quoting for you.

```python
import csv

with open("servers.csv", newline="") as f:
    for row in csv.DictReader(f):
        print(row["name"], row["cpu"])

with open("out.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["name", "cpu"])
    w.writeheader()
    w.writerow({"name": "web, east", "cpu": 4})
```

Open CSV files with `newline=""`, as the documentation says, and convert numbers yourself, because every value is text. For big files, loop over rows instead of loading all of them into a list.

## INI files with configparser

Many tools still use `[section]` files with `key = value` lines. `configparser` reads them and supports defaults and typed getters.

```python
import configparser

cfg = configparser.ConfigParser()
cfg.read("app.ini")
port = cfg.getint("server", "port", fallback=8080)
debug = cfg.getboolean("server", "debug", fallback=False)
```

Keys are case-insensitive by default, and `%` has special meaning in values unless you use the raw parser.

## Validate before you trust

A file that parses is not necessarily valid. Check required keys, types and ranges at the point where you read, and fail with a message that names the file and the key.

```python
def require(data, key, kind):
    if key not in data:
        raise ValueError(f"deploy.yaml: missing key {key!r}")
    if not isinstance(data[key], kind):
        raise ValueError(f"deploy.yaml: {key!r} must be {kind.__name__}")
    return data[key]
```

For larger schemas, a library such as `jsonschema` or `pydantic` describes the rules in one place and reports every error at once.

```predict
Q: A YAML file has `country: NO`. What does `yaml.safe_load` return for that value, and how do you fix the file?
???
It returns the boolean False in YAML 1.1 parsers such as PyYAML. Quote it: `country: "NO"`.
> Unquoted yes, no, on and off are booleans in YAML 1.1.
```

## Incident: The list that lost a server

> **Incident:** A script that read an inventory exported from a spreadsheet silently dropped one server from a maintenance run.

```console
$ grep -n "db,east" inventory.csv
17:db,east,4,16
$ python3 -c "print('db,east,4,16'.split(','))"
['db', 'east', '4', '16']
```

The exporter wrote the name as `"db, east"` with quotes, and the script split lines on commas, so the columns shifted and the host failed a numeric check and was skipped. Switching to `csv.DictReader` fixed it. The team also added a check that compares the number of rows read with the number of lines in the file and stops on a mismatch.

## Common mistakes

- Using yaml.load on files you did not write
- Splitting CSV lines with split(",")
- Forgetting newline="" when opening CSV files
- Trusting parsed data without checking required keys

```quiz
Q: Which function loads YAML without running arbitrary code?
+ yaml.safe_load
- yaml.load :: It can construct arbitrary objects.
- eval :: It executes code.
- pickle.load :: It can run code too.
> safe_load builds only plain data types.

Q: Why use the csv module?
+ It handles quoted fields, commas and line breaks inside values
- It is faster than reading a file :: Speed is not the main reason.
- It converts numbers :: Values stay text.
- It sorts the rows :: It does not sort.
> Quoting rules are easy to get wrong by hand.

Q: What does configparser.getint return when the key is missing and a fallback is given?
+ The fallback value
- An error always :: A fallback prevents that.
- None :: It returns the fallback.
- Zero :: Only if the fallback is zero.
> Typed getters accept fallbacks.

Q: What should you do after parsing a config file?
+ Validate required keys, types and ranges and report errors that name the file
- Nothing, parsing is enough :: A file can parse and still be wrong.
- Ignore missing keys :: That hides mistakes.
- Convert everything to strings :: That loses information.
> Fail early with a clear message.
```

```cards
Safe YAML loading :: yaml.safe_load(f)
Dump YAML keeping order :: yaml.safe_dump(data, sort_keys=False)
Read CSV rows as dicts :: csv.DictReader
Open CSV files with :: newline=""
Typed INI value :: cfg.getint(section, key, fallback=...)
```
