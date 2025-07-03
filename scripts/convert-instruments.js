// scripts/convert-instruments.js
const fs = require('fs');
const path = require('path');

function convertCSVToJSON(csvFilePath, outputPath) {
  try {
    console.log('Reading CSV file...');
    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    
    const lines = csvData.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error('Invalid CSV file - not enough lines');
    }
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    console.log('CSV Headers:', headers);
    
    const instruments = [];
    let processedCount = 0;
    let skippedCount = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        // Better CSV parsing - handle quoted values
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim()); // Push last value
        
        if (values.length >= headers.length) {
          const instrument = {};
          headers.forEach((header, index) => {
            instrument[header] = values[index] ? values[index].replace(/"/g, '').trim() : "";
          });
          
          // Filter for NSE equity and MCX commodities
          const isNSEEquity = instrument.exchange === "NSE" && 
  (instrument.segment === "EQ" || instrument.instrument_type === "EQ");
          const isMCXCommodity = instrument.exchange === "MCX";
          
          if (isNSEEquity || isMCXCommodity) {
            const processedInstrument = {
              key: `${instrument.exchange}:${instrument.tradingsymbol}`,
              tradingsymbol: instrument.tradingsymbol,
              name: instrument.name || instrument.tradingsymbol,
              exchange: instrument.exchange,
              instrument_type: instrument.instrument_type,
              segment: instrument.segment,
              expiry: instrument.expiry || null,
              strike: instrument.strike || null,
              lot_size: parseInt(instrument.lot_size) || 1,
              tick_size: parseFloat(instrument.tick_size) || 0.05,
              display_name: `${instrument.tradingsymbol} - ${instrument.name || instrument.tradingsymbol}`,
              exchange_display: instrument.exchange,
              instrument_token: instrument.instrument_token,
              // Additional useful fields
              last_price: parseFloat(instrument.last_price) || 0,
              exchange_token: instrument.exchange_token
            };
            
            instruments.push(processedInstrument);
            processedCount++;
          } else {
            skippedCount++;
          }
        }
      } catch (parseError) {
        console.error(`Error parsing line ${i}:`, parseError.message);
      }
    }
    
    console.log(`Processed: ${processedCount}, Skipped: ${skippedCount}`);
    console.log(`Total instruments to save: ${instruments.length}`);
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save to JSON file
    const jsonData = {
      metadata: {
        total: instruments.length,
        lastUpdated: new Date().toISOString(),
        source: 'zerodha_instruments_csv',
        exchanges: ['NSE', 'MCX'],
        nseCount: instruments.filter(i => i.exchange === 'NSE').length,
        mcxCount: instruments.filter(i => i.exchange === 'MCX').length
      },
      instruments: instruments
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    console.log(`✅ Successfully converted ${instruments.length} instruments to JSON`);
    console.log(`📁 Output saved to: ${outputPath}`);
    
    // Log some statistics
    const exchanges = [...new Set(instruments.map(i => i.exchange))];
    console.log('\n📊 Statistics:');
    exchanges.forEach(exchange => {
      const count = instruments.filter(i => i.exchange === exchange).length;
      console.log(`   ${exchange}: ${count} instruments`);
    });
    
    // Show sample SBI instruments
    const sbiInstruments = instruments.filter(i => 
      i.tradingsymbol.toLowerCase().includes('sbi')
    );
    console.log(`\n🔍 Found ${sbiInstruments.length} SBI-related instruments:`);
    sbiInstruments.forEach(inst => {
      console.log(`   ${inst.key} - ${inst.name}`);
    });
    
    return jsonData;
    
  } catch (error) {
    console.error('❌ Error converting CSV to JSON:', error.message);
    throw error;
  }
}

// Usage
if (require.main === module) {
  const csvPath = process.argv[2] || './data/instruments.csv';
  const jsonPath = process.argv[3] || './data/instruments1.json';
  
  console.log('🚀 Starting CSV to JSON conversion...');
  console.log(`📄 Input CSV: ${csvPath}`);
  console.log(`📁 Output JSON: ${jsonPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found: ${csvPath}`);
    console.log('\n📋 Instructions:');
    console.log('1. Download instruments CSV from Zerodha manually');
    console.log('2. Save it as ./data/instruments.csv');
    console.log('3. Run: node scripts/convert-instruments.js');
    process.exit(1);
  }
  
  try {
    convertCSVToJSON(csvPath, jsonPath);
    console.log('\n✅ Conversion completed successfully!');
  } catch (error) {
    console.error('\n❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

module.exports = { convertCSVToJSON };