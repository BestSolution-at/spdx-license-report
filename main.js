exports.generateReport = function (sbom, format) {
    var data = JSON.parse(sbom);

    var tableData = [];

    for (var component of data.components) {
        tableData.push(
            {
                group: component.group ?? '',
                name: component.name ?? 'unknown',
                version: component.version ?? 'unknown',
                author: component.author ?? 'unknown',
                licenses: component.licenses?.filter(l => l !== undefined).map(l => l?.license?.id).join(',') || 'unknown',
            }
        );
    }

    tableData.sort( (a, b) => {
        if( a.group == '' && b.group !== '' ) {
            return 1;
        } else if( a.group !== '' && b.group === '' ) {
            return -1;
        }
        const rv = a.group.localeCompare(b.group);
        if( rv === 0 ) {
            return a.name.localeCompare(b.name);
        }
        return rv;
    });

    var header = ['group', 'name', 'version', 'author', 'licenses']

    const grouped = tableData.reduce((group, component) => {
        group[component.licenses.split(',')[0]] = (group[component.licenses.split(',')[0]] ?? 0)+1;
        return group;
    }, {});

    const computePercentage = key => {
        return Math.round((grouped[key] / tableData.length)*100*100)/100;
    }

    if( format === undefined || format === 'json' ) {
        return JSON.stringify(tableData);
    } else if ( format === 'html') {
        return html(data, header, tableData, grouped, computePercentage);
    } else if (format === 'text') {
        return text(data, header, tableData, grouped, computePercentage);
    } else if (format === 'md') {
        return md(data, header, tableData, grouped, computePercentage);
    }
}

function html(data, header, tableData, grouped, computePercentage) {
    var html = `<html>
    <head>
        <title>License report ${data.metadata?.component['bom-ref'] ?? 'unknown'}</title>
        <style>
            body {
                font-family: monospace;
                padding: 20px;
            }
            table {
                border-collapse : collapse;
            }
            th {
                text-transform: capitalize;
                font-variant-caps: small-caps;
                letter-spacing: 0.66;
                text-align: left;
                padding: 10px 20px;
                border-width: 0 0 2px;
                border-color: black;
                border-style: solid;
            }
            td {
                padding: 10px 20px;
            }
            tbody > tr:hover {
                background-color: rgba(0,0,0,0.05);
            }
            .summary {
                display: grid;
                grid-template-columns: max-content auto;
                column-gap: 20px;
                row-gap: 10px;
            }

            .bold {
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <h1>Summary</h1>
        <div class="summary">
            <div class="bold">Project</div>
            <div>${data.metadata?.component['bom-ref'] ?? ''}</div>
            <div class="bold">Total Package count</div>
            <div>${tableData.length}</div>
            <div class="bold">Packages by License</div>
            <div></div>
${ Object.keys(grouped).sort((a,b) => (grouped[a] - grouped[b])*-1).map( g => `            <div style="text-align: right;">${g}</div>\n            <div>${grouped[g]} (${computePercentage(g)}%)</div>` ).join('\n') }
        </div>
        <h1>Details</h1>
        <table>
            <thead>
                <tr>
${header.map( h => `                    <th>${h}</th>`).join('\n')}
                </tr>
            </thead>
            <tbody>
${tableData.map( e => `                <tr>\n${header.map( h => `                    <td>${e[h]}</td>`).join('\n')}\n                </tr>`).join('\n')}
            </tbody>
        </table>
        
    </body>
    </html>`
    return html;
}

function md(data, header, tableData, grouped, computePercentage) {
    var tabularData = tableData.map(e => {
        return [e.group, e.name, e.version, e.author, e.licenses];
    })

    var tableColumnWidths = header.map( (_, idx) => computeColumnWidth(idx, tabularData, header));

    var licenseColumnWidth = Math.max( ...[ 'License', ...Object.keys(grouped)].map( e => e.length) )
    var countWidth = Math.max( ...['Count', ...Object.keys(grouped).map( k => String(grouped[k]))].map( e => e.length) )
    var percentageWidth = Math.max( ...['Percentage', ...Object.keys(grouped).map( k => `(${computePercentage(k)})%`)].map( e => e.length) )

    var text =
`# Summary

**Project:** ${data.metadata?.component['bom-ref'] ?? ''}  
**Total Package count:** ${tableData.length}

## Packages by License

| ${prepareCell('License', licenseColumnWidth)} | ${prepareCell('Count',countWidth)} | ${prepareCell('Percentage',percentageWidth )} |
| ${generateChars('-', licenseColumnWidth)} | ${generateChars('-', countWidth)} | ${generateChars('-', percentageWidth)} |
${Object.keys(grouped).sort((a,b) => (grouped[a] - grouped[b])*-1).map( k => `| ${prepareCell(k, licenseColumnWidth, 'right')} | ${prepareCell(String(grouped[k]), countWidth, 'right')} | ${prepareCell(`(${computePercentage(k)})%`,percentageWidth, 'right')} |`).join('\n')}

# Details

| ${header.map( (v, idx) => prepareCell(v.toUpperCase(),tableColumnWidths[idx])).join(' | ') } |
| ${header.map( (v, idx) => generateChars('-',tableColumnWidths[idx])).join(' | ') } |
| ${tabularData.map( row => { return row.map( (v,idx) => prepareCell(v, tableColumnWidths[idx]) ).join(' | ') } ).join(' |\n| ')}

`
    return text;
}

function text(data, header, tableData, grouped, computePercentage) {
    var tabularData = tableData.map(e => {
        return [e.group, e.name, e.version, e.author, e.licenses];
    })

    var tableColumnWidths = header.map( (_, idx) => computeColumnWidth(idx, tabularData, header));
    var summaryColumnWidth = Math.max( ...['Project','Total Package count', 'Packages by License', ...Object.keys(grouped) ].map( e => e.length) )
    var countWidth = Math.max( ...Object.keys(grouped).map( k => String(grouped[k])).map( e => e.length) )
    var percentageWidth = Math.max( ...Object.keys(grouped).map( k => `(${computePercentage(k)})%`).map( e => e.length) )

    var totalWidth = tableColumnWidths.reduce((sum, v) => {
        return sum + v;
    }, 0) + tableColumnWidths.length - 1;

    var text = 
`${generateChars('=', totalWidth)}
SUMMARY
${generateChars('=', totalWidth)}

${prepareCell('Project', summaryColumnWidth)} ${data.metadata?.component['bom-ref'] ?? ''}
${prepareCell('Total Package count', summaryColumnWidth)} ${tableData.length}
${prepareCell('Packages by License', summaryColumnWidth)}
${Object.keys(grouped).sort((a,b) => (grouped[a] - grouped[b])*-1).map( k => `${prepareCell(k, summaryColumnWidth, 'right')} ${prepareCell(String(grouped[k]), countWidth, 'right')} ${prepareCell(`(${computePercentage(k)})%`,percentageWidth, 'right')}`).join('\n')}

${generateChars('=', totalWidth)}
DETAILS
${generateChars('=', totalWidth)}

${header.map( (v, idx) => prepareCell(v.toUpperCase(),tableColumnWidths[idx])).join(' ') }
${header.map( (v, idx) => generateChars('-',tableColumnWidths[idx])).join(' ') }
${tabularData.map( row => { return row.map( (v,idx) => prepareCell(v, tableColumnWidths[idx]) ).join(' ') } ).join('\n')}
`;
    return text;
}

function prepareCell(value, size, alignment) {
    if( value.length < size ) {
        if( alignment === 'right' ) {
            return generateChars(' ', size - value.length) + value;
        }
        return value + generateChars(' ', size - value.length);
    }
    return value;
}

function generateChars(char, amount) {
    let rv = '';
    for (var i = 0; i < amount; i++) {
        rv += char;
    }
    return rv;
}

function computeColumnWidth(index, tabularData, header) {
    return Math.max(computeLongestItem(tabularData, index), header[index].length);
}

function computeLongestItem(tabularData, index) {
    var nums = tabularData.map(l => l[index]).map(e => {
        return e.length;
    });
    return Math.max(...nums);
}