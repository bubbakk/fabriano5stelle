'use strict';

const path = require('path');
const gulp = require('gulp');
const mergeStgream = require('merge-stream');
const del = require('del');

const polymerJsonPath = path.join(process.cwd(), 'polymer.json');
const polymerJSON = require(polymerJsonPath);
const polymer = require('polymer-build');
const polymerProject = new polymer.PolymerProject(polymerJSON);
const buildDirectory = 'build/bundled';

/**
 * Waits for the given ReadableStream
 */
function waitFor(stream) {
    return new Promise((resolve, reject) => {
       stream.on('end', resolve);
       stream.on('error', reject); 
    });
}

function build() {
    return new Promise((resolve, reject) => {
        // OK, so firts, thing we do is clear the build
        console.log('Deleting build/ directory...');
        del([buildDirectory])
            .then(_ => {
                // OK, now lets get you files
                let sourceStream = polymerProject.sources()
                    // oh, well do you want to minify stuff? Go for it!
                    // Here's how splitHtml & gulpif work
                    .pipe(polymerProject.splitHtml())
                    // .pipe(gulpif(/\.js$/, uglify()))
                    // .pipe(gulpif(/\.css$/, cssSlam()))
                    // .pipe(gulpif(/\.html$/, htmlMinifier()))
                    .pipe(polymerProject.rejoinHtml());

                // OK, now lets do the same to your dependencies
                let depsStream = polymerProject.dependencies()
                    .pipe(polymerProject.splitHtml())
                    // .pipe(gulpif(/\.js$/, uglify()))
                    // .pipe(gulpif(/\.css$/, cssSlam()))
                    // .pipe(gulpif(/\.html$/, htmlMinifier()))
                    .pipe(polymerProject.rejoinHtml());
                
                // OK, now lets merge them into a single build stream.
                let buildStream = mergeStream(sourcesStream, depsStream)
                    .once('data', () => {
                        console.log('Analyzing build dependenties...');
                    });
                
                // If you want bundling, do dome bundling
                buildStream = buildStream.pipe(polymerProject.bundler);

                // If you want to add prefetch links, do it!
                buildStream = buildStream.pipe(new PrefetchTransform(polymerProject));

                // OK, time to pipe to the build directory
                buildStream = buildStream.pipe(gulp.dest(buildDirectory));

                // waitFot the buildStream to complete
                return waitFor(buildStream);
        })
        .then(_ => {
            // You di it!
            console.log('Build complete!');
            resolve();
        });
    });
}

gulp.task('default', build);