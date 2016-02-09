var gulp = require('gulp'),
    minifyInlineScripts = require('gulp-minify-inline-scripts'),
    inlinesource = require('gulp-inline-source'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    notify = require("gulp-notify"),
    rename = require('gulp-rename'),
    jshint = require('gulp-jshint'),
    minifyInline = require('gulp-minify-inline'),
    del = require('del');


gulp.task('inlinesource', function () {
    return gulp.src('./*.html', {base: '.'})
        .pipe(inlinesource())
        .pipe(minifyInline())
        .pipe(minifyInlineScripts())
        .pipe(gulp.dest('./inline'));
});

gulp.task('minifyinline', function () {
    return gulp.src('./*.html', {base: '.'})
        .pipe(gulp.dest('/inline'));
});

gulp.task('default', ['inlinesource']);
