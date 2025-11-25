#! node

const { Transform, Duplex } = require('node:stream');
const fs = require('fs/promises');
const fsSync = require("fs");
const PATH = require('path');
const yaml = require('./js-yaml-mod'); // require('js-yaml');
const archiver = require('archiver');
const semver = require('semver');
const { merge, mergeWith } = require('lodash');

const locCounts = {};
const REGIONS = {};

/** 
 * @typedef TrackCheck
 * @property {string} name
 * @property {string[]} t
 * @property {string} hint
 * @property {string[]} category
 * @property {string} region
 * @property {string|string[]} requires
 */
/** 
 * @typedef RegionDefinition
 * @property {string} name
 * @property {string[]} connects_to
 * @property {string} requires
 */
/**
 * @typedef TrackContainer
 * @property {TrackCheck} track
 * @property {TrackCheck} region
 * @property {TrackCheck[]} checks
 */

/**
 * 
 * @param {Record<string, { requires?: string, category?: Array<string>}>} tagDefs 
 * @param {Array<TrackCheck|TrackContainer>} locationArray 
 * @returns 
 */
function parseLocations(tagDefs, locationArray) {
	return _flatten(locationArray);
	
	function _flatten(array, common={}) {
		const outList = [];
		for (const item of array) {
			if (typeof item.common === 'object' && Array.isArray(item.data)) {
				_extractRegion(item.common);
				const tags = _getTags(common);
				for (const i2 of _flatten(item.data, item.common)) {
					outList.push(mergeWith(i2, common, ...tags, _mergeCustom));
				}
			} else {
				_extractRegion(item);
				const tags = _getTags(item);
				outList.push(mergeWith({}, item, common, ...tags, _mergeCustom));
			}
		}
		for (const o of outList) {
			delete o.t;
		}
		return outList;
	}
	
	function _getTags(item) {
		// console.log("_getTags()", item);
		if (!Array.isArray(item.t)) return [];
		const arr = [];
		for (const t of item.t) {
			const def = tagDefs[t] ?? {};
			// console.log("Tag =>", t);
			if (def.c) {
				for (const c of def.c) {
					locCounts[c] ??= 0
					locCounts[c]++;
				}
			} else {
				locCounts[t] ??= 0
				locCounts[t]++;
			}
			arr.push(def);
			if (def.t) arr.push(..._getTags(def));
		}
		return arr;
	}
	
	function _extractRegion(item) {
		if (typeof item.region === 'object') {
			const region = item.region;
			const name = region.name;
			delete region.name;
			item.region = name;
			REGIONS[name] = region;
		}
	}
	
	function _mergeCustom(ov, sv, key) {
		if (key === "name" && typeof ov === 'string' && typeof sv === 'string') {
			return `${sv} - ${ov}`;
		}
		if (key === "requires" && typeof ov === 'string' && typeof sv === 'string') {
			return `${sv} and ${ov}`;
		}
	}
}

// function parseLocations(tagDefs, locationArray) {
// 	const outList = [];
// 	for (const loc of locationArray) {
// 		if (typeof loc.track === 'object') {
// 			outList.push(..._applyTrack(loc));
// 		} else {
// 			outList.push(_applyTags(loc));
// 		}
// 	}
// 	return outList;
// 	/**
// 	 * @param {TrackContainer} loc 
// 	 */
// 	function _applyTrack(loc) {
// 		const out = [];
// 		const { track, region, checks } = loc;
// 		if (typeof region === 'object') {
// 			const name = region.name;
// 			delete region.name;
// 			if (typeof track.region === 'undefined') {
// 				track.region = name;
// 			}
// 			REGIONS[name] = region;
// 			console.log("REGION: ", region);
// 		}
// 		for (const ch of checks) {
// 			if (typeof track.name === "string" && typeof ch.name === 'string') {
// 				ch.name = `${track.name} - ${ch.name}`;
// 			}
// 			if (Array.isArray(track.category)) {
// 				ch.category ??= [];
// 				ch.category.unshift(...track.category);
// 			}
// 			ch.region ??= track.region;
// 			out.push(_applyTags(ch));
// 		}
// 		return out;
// 	}
// 	/**
// 	 * @param {TrackCheck} loc 
// 	 */
// 	function _applyTags(loc) {
// 		if (!Array.isArray(loc.t)) return loc;
// 		let out = Object.assign({}, loc);
// 		if (!Array.isArray(loc.requires)) {
// 			let r = loc.requires;
// 			out.requires = [ r ].filter(x=>x);
// 		}
// 		// Ensure out.category is always an array before pushing to it
// 		if (!Array.isArray(out.category)) {
// 			out.category = [];
// 		}
// 		for (const tag of loc.t) {
// 			locCounts[tag] ??= 0
// 			locCounts[tag]++;
// 			if (tagDefs[tag]?.requires) out.requires.push(tagDefs[tag].requires);
// 			if (tagDefs[tag]?.category) out.category.push(...tagDefs[tag].category);
// 			if (Array.isArray(tagDefs[tag]?.t)) {
// 				for (const tt of tagDefs[tag].t) {
// 					locCounts[tt] ??= 0
// 					locCounts[tt]++;
// 				}
// 			}
// 		}
// 		delete out.t;
// 		out.requires = out.requires.join(" and ");
// 		if (!out.requires) delete out.requires;
// 		return out;
// 	}
// }

function flattenArray(array, common={}) {
	const outList = [];
	for (const item of array) {
		if (typeof item.common === 'object' && Array.isArray(item.data)) {
			for (const i2 of flattenArray(item.data, item.common)) {
				outList.push(mergeWith(i2, common, mergeCustom));
			}
		} else {
			outList.push(mergeWith({}, item, common, mergeCustom));
		}
	}
	return outList;
	
	function mergeCustom(ov, sv, key) {
		if (key === "name" && typeof ov === 'string' && typeof sv === 'string') {
			return sv + ov;
		}
	}
}

function parseOptions(opts) {
	for (const opt in opts.user) {
		opts.user[opt].description = opts.user[opt].description.replaceAll(/\$\{(\w+)\}/ig, (str, val)=>{
			let v = locCounts[val];
			if (typeof v === 'undefined') return str;
			return v;
		});
	}
	return opts;
}

/**
 * 
 * @param {string} str - Input string
 * @returns {object}
 */
function parseYaml(str) {
	let mode = 'direct';
	let $schema;
	
	let json = yaml.loadAll(str, {
		onUnknownDirective: (dir, args)=>{
			if (dir === "SCHEMA") $schema = args[0];
			if (dir === "OUTPUT") mode = args[0];
		}
	});
	switch (mode) {
		case 'flatten':
			if (json.length !== 1) throw new TypeError("OUTPUT direct documents must only have 1 yaml document in them.");
			return flattenArray(json[0]);
		case 'locations':
			if (json.length !== 2) throw new TypeError("OUTPUT location documents expect two documents, a tag definition list and a location list.");
			return parseLocations(...json);
		case 'options':
			if (json.length !== 1) throw new TypeError("OUTPUT direct documents must only have 1 yaml document in them.");
			const out = parseOptions(json[0]);
			out['$schema'] = $schema;
			return out;
		case 'direct':
			if (json.length !== 1) throw new TypeError("OUTPUT direct documents must only have 1 yaml document in them.");
			json = json[0];
			if ($schema) {
				if (Array.isArray(json)) {
					json = { data: json };
				}
				json['$schema'] = $schema;
			}
			return json;
		default:
			return json;
			
	}
}

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
		let json = parseYaml(this.#buffer.toString('utf8'));
		if (this.readableObjectMode) {
			this.push(json);
		} else {
			this.push(JSON.stringify(json, undefined, 4));
		}
		done();
	}
}

const SRC_FILES = [ 
	// Order important
//	'locations.yml', // includes regions
	'items.yml',
//	'regions.yml',
	'categories.yml',
	'game.yml', 
	'meta.yml', 
	'options.yml', // Last
];

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
	
	// Data files
	{
		console.log('Converting locations.yml');
		let data = await fs.readFile(`src/locations.yml`);
		data = parseYaml(data);
		zip.append(JSON.stringify(data, undefined, 4), { name: `locations.json`, prefix:`${prefix}/data` })
		zip.append(JSON.stringify(REGIONS, undefined, 4), { name: `regions.json`, prefix:`${prefix}/data` })
	}
	for (const f of SRC_FILES) {
		console.log('Converting', f);
		const rs = fsSync.createReadStream(`src/${f}`);
		const ts = new YamlToJsonTransform();
		rs.pipe(ts);
		zip.append(ts, { name: `${PATH.basename(f, '.yml')}.json`, prefix:`${prefix}/data` });
	}
	
	console.log("locCounts =", locCounts);
	
	// Logic files
	for (const f of await fs.readdir('lib', { recursive:true, withFileTypes:false })) {
		if (f.startsWith('data')) continue;
		if (!PATH.extname(f)) continue;
		console.log('Outputting', f);
		const rs = fsSync.createReadStream(PATH.join('lib', f));
		zip.append(rs, { name: f, prefix });
	}
	
	// Manifest file
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
