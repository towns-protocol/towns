const INPUT_DIR = 'contracts'
const OUTPUT_DIR = 'contracts/docs/docs'
const SUMMARY_FILE = 'contracts/docs/README.md'
const EXCLUDE_FILE = 'contracts/docs/exclude.txt'

const fs = require('fs')
const path = require('path')
const { docgen } = require('solidity-docgen')

const excludeList = lines(EXCLUDE_FILE).map((line) => INPUT_DIR + '/' + line)
const relativePath = path.relative(path.dirname(SUMMARY_FILE), OUTPUT_DIR)

function lines(pathName) {
    return fs.readFileSync(pathName, { encoding: 'utf8' }).split('\r').join('').split('\n')
}

function scan(pathName, indentation) {
    if (!excludeList.includes(pathName)) {
        if (fs.lstatSync(pathName).isDirectory()) {
            fs.appendFileSync(SUMMARY_FILE, indentation + '* ' + path.basename(pathName) + '\n')
            for (const fileName of fs.readdirSync(pathName)) {
                scan(pathName + '/' + fileName, indentation + '  ')
            }
        } else if (pathName.endsWith('.sol')) {
            const text = path.basename(pathName)
            const _split = pathName.split('/')
            const link = _split[_split.length - 1].replace('.sol', '')
            fs.appendFileSync(
                SUMMARY_FILE,
                indentation + '* [' + text + '](' + 'docs' + '/' + link + '.md)\n',
            )
        }
    }
}

function fix(pathName) {
    if (fs.lstatSync(pathName).isDirectory()) {
        for (const fileName of fs.readdirSync(pathName)) fix(pathName + '/' + fileName)
    } else if (pathName.endsWith('.md')) {
        fs.writeFileSync(
            pathName,
            lines(pathName)
                .filter((line) => line.trim().length > 0)
                .join('\n\n') + '\n',
        )
    }
}

fs.writeFileSync(SUMMARY_FILE, '# README\n')
// fs.writeFileSync('.gitbook.yaml', 'root: ./\n')
// fs.appendFileSync('.gitbook.yaml', 'structure:\n')
// fs.appendFileSync('.gitbook.yaml', '  readme: ' + README_FILE + '\n')
// fs.appendFileSync('.gitbook.yaml', '  summary: ' + SUMMARY_FILE + '\n')
scan(INPUT_DIR, '')
fix(OUTPUT_DIR)

async function main() {
    let solidityFileDirs = fs.readdirSync('out')

    const output = { sources: {} }

    solidityFileDirs
        .filter((dir) => dir.endsWith('.sol'))
        .filter((dir) => !dir.includes('draft-'))
        .map((dir) => {
            let files = fs.readdirSync(`out/${dir}`)
            let fileName = files.find(
                (file) => !file.endsWith('abi.json') && file.endsWith('.json'),
            )

            let source = JSON.parse(fs.readFileSync(`out/${dir}/${fileName}`, 'utf8'))

            output.sources[dir] = source
        })

    await docgen(
        [
            {
                input: { sources: {} },
                output,
            },
        ],
        {
            outputDir: OUTPUT_DIR,
            pages: 'items',
        },
    )
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
