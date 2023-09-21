# spdx-license-report

Generate a simple license reports from SPDX

# Usage

```sh
npm install -g @bestsolution/spdx-license-report
spdx-license-report --source=/path/to/sbom.json
```

## Options

- `--source=/path/to/sbom.json` - required - Path to the bom.json
- `--format=json|text|html|md` - optional - Report format. Defaults to `json`
- `--outfile=/path/to/output` - optional - File to write report to. Defaults to `STDOUT`
- `--help` optional - Prints usage messge

