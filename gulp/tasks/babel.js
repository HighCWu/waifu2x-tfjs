var gulp = require('gulp');
var babel = require('gulp-babel');
var config = require('../config').babel;

gulp.task('babel', function () {
    return gulp.src(config.src + '/**/*.js')
        .pipe(babel({
            "presets": ['env'],
            "plugins": [
                ["transform-runtime", {
                  "polyfill": false,
                  "regenerator": true
                }]
              ]
        }))
        .pipe(gulp.dest(config.dest));
});
