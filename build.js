#! node

const { Transform } = require('node:stream');
const fs = require('fs/promises');
const fsSync = require("fs");
const PATH = require('path');
const yaml = require('js-yaml');
const archiver = require('archiver');
const semver = require('semver');

// Thanks to https://github.com/ad-si/yaml2json/blob/master/source/index.js
class YamlToJsonTransform extends Transform {
	/** @type {Buffer} */ #buffer;
	/**
	 * 
	 * @param {import('node:stream').TransformOptions} opts 
	 */
	constructor(opts={}) {
		super(opts);
		this.#buffer = new Buffer.alloc(0);
	}
	
	_transform(data, encoding, done) {
		this.#buffer = Buffer.concat([this.#buffer, data]);
		done();
	}
	_flush(done) {
		let json = yaml.load(this.#buffer.toString('utf8'));
		if (this.readableObjectMode) {
			this.push(json);
		} else {
			this.push(JSON.stringify(json, undefined, 4));
		}
		done();
	}
}

async function main() {
	let prefix = 'manual_undefined_undefined';
	{
		const str = await fs.readFile(`src/game.yml`, { encoding:'utf8' });
		const data = yaml.load(str);
		prefix = `manual_${data['game']}_${data['creator']}`;
	}
	prefix = prefix.toLowerCase();
	
	const outPath = process.argv[2] ?? PATH.resolve('out');
	await fs.mkdir(outPath, { recursive:true });
	
	const out = fsSync.createWriteStream(PATH.resolve(outPath, `${prefix}.apworld`));
	const zip = archiver('zip', { zlib: { level: 9 } });
	
	zip.on('close', ()=>{
		console.log(`APWorld archive (${zip.pointer()} bytes) written to ${out.path}`);
	});
	zip.on('warning', (err)=> console.error('Warning archiving data:', err));
	zip.pipe(out);
	
	for (const f of await fs.readdir('src')) {
		if (!f.endsWith('yml')) continue;
		console.log('Converting', f);
		const rs = fsSync.createReadStream(`src/${f}`);
		const ts = new YamlToJsonTransform();
		rs.pipe(ts);
		zip.append(ts, { name: `${PATH.basename(f, '.yml')}.json`, prefix:`${prefix}/data` });
	}
	for (const f of await fs.readdir('dist', { recursive:true, withFileTypes:false })) {
		if (f.startsWith('data')) continue;
		if (!PATH.extname(f)) continue;
		console.log('Outputting', f);
		const rs = fsSync.createReadStream(PATH.join('dist', f));
		zip.append(rs, { name: f, prefix });
	}
	{
		let package = {};
		let json = {};
		try {
			json = JSON.parse(await fs.readFile("archipelago.json", { encoding:'utf8' }));
		} catch {}
		try {
			package = JSON.parse(await fs.readFile("package.json", { encoding:'utf8' }));
		} catch (e) {
			console.error(`Unable to to open package.json`, e);
		}
		
		let output = {
			game: prefix,
			world_version: package.version,
			authors: [ package.author ],
			version: 6, compatible_version: 5,
		};
		if (package.engines?.archipelago) {
			output.minimum_ap_version = semver.minVersion(package.engines['archipelago']).format();
			// output.maximum_ap_version = semver.maxSatisfying();
		}
		output = Object.assign({}, output, json);
		console.log(output);
		zip.append(JSON.stringify(output), { name: "archipelago.json" });
	}
	zip.finalize();
}
main();
