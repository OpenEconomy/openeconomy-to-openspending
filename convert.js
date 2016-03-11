var fs = require('fs'),
    path = require('path'),
    when = require('when'),
    node = require('when/node'),
    dsv = require('d3-dsv'),
    fsp = node.liftAll(require('fs')); // promisified version of fs

function convertOpenSpending(agg) {
    //console.log(agg);
    var rows = [];
    agg.items.forEach(function(item) {
        //console.log(item);
        Object.keys(item.periods).forEach(function(period) {
            var items = item.periods[period].items;
            if (items && items.length > 0) {
                console.log(items.length);
            }
            rows.push({
                year:period.replace(/\d\d-/,''), // 2005-06 -> 2006
                category:item.name,
                amount:agg.periods[period].value}
                );
        });
    });
    return dsv.csvFormat(rows);
}

// generate a CSV file in more standard OpenSpending format
function convertOpenEconomyTransposed(agg) {
    //console.log(agg);
    var rows = [];
    console.log(agg.periods);
    Object.keys(agg.periods).forEach(function(period) {
        var row = {Year: period};
        
        agg.items.forEach(function(item) {
            console.log(item);
            row[item.name] = item.periods[period].value;
        });
        rows.push(row);
    });
    return dsv.csvFormat(rows);
}
// recursively transform an item into a series of CSV rows
function itemToRows(item, parent) {
    var rows = [{
        Item: item.name,
        Parent: parent
    }];
    console.log(item.name);
    Object.keys(item.periods).forEach(function(period) {
        rows[0][period] = item.periods[period].value;
    });
    if (item.items && item.items.length > 0) {
        item.items.forEach(function(subitem) {
            rows = rows.concat(itemToRows(subitem, item.name));
        });
    }
    return rows;
}

// generate a CSV file in the intermediate "OpenEconomy" format
function convertOpenEconomy(agg) {
    var rows = [];
    return dsv.csvFormat(itemToRows(agg, ''));
}



function convertAll() {
    var indir = path.join(__dirname, 'in');
    var outdir = path.join(__dirname, 'out');
    var outdiroe = path.join(__dirname, 'out-oe');
    return when.map(fsp.readdir(indir), function (filename) {
        return fsp.readFile(path.join(indir, filename), 'utf8').then(function(data) {
            var aggregates = JSON.parse(data).aggregates;
            aggregates.forEach(function(agg) {
                return fsp.writeFile(path.join(outdir, filename.replace('\.json','') + '-' + agg.name + '.csv'), convertOpenSpending(agg), 'utf8').then(function() {
                    //console.log('Converted ' + filename);
                }).then(function() {
                    return fsp.writeFile(path.join(outdiroe, filename.replace('\.json','') + '-' + agg.name + '.csv'), convertOpenEconomy(agg), 'utf8');
                });
            });
        });
    });
}

convertAll();