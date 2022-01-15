import sass from 'rollup-plugin-sass'
import typescript from 'rollup-plugin-typescript2'

import pkg from './package.json'

export default {
    input: 'src/auth.js',
    output: [
        {
            file: pkg.main,
            format: 'es',
            exports: 'named',
            sourcemap: true,
            strict: false
        }
    ],
    plugins: [
        sass({ insert: true }),
        typescript({ objectHashIgnoreUnknownHack: true })
    ],
    external: []
}