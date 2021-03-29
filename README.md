[![Build and deploy](https://github.com/matsev/matsev.github.io/actions/workflows/cicd.yml/badge.svg)](https://github.com/matsev/matsev.github.io/actions/workflows/cicd.yml)

## Mattias' web site

This is the source code of my personal web site, https://matsev.github.io/

## Installation

* Use [rbenv](https://github.com/rbenv/rbenv#groom-your-apps-ruby-environment-with-rbenv) to setup Ruby
    * See [.ruby-version](.ruby-version) for current Ruby version
* Install bundler `$ gem install bundler`
* Project setup:
    * Create empty Gemfile `bundle init`
    * Install gems in `./vendor/bundle/` by configuring bundle `$ bundle config --local set path 'vendor/bundle'` (creates [.bundle/config](.bundle/config))
    * Ref https://jekyllrb.com/tutorials/using-jekyll-with-bundler/
* Install dependencies `$ bundle install`
* Serve site `$ bundle exec jekyll serve`
* Update bundler `$ gem update bundler && bundle update --bundler`
