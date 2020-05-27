/* eslint-env mocha */
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const jsonREshape = require('./jsonreshape')
const _ = require('lodash')

chai.use(dirtyChai)
chai.config.includeStack = true
const expect = chai.expect

describe('JsonREshape', () => {
  describe('#reshape', () => {
    context('when given a json object we need to reshape with a complex series of transforms', () => {
      let exampleArticle
      beforeEach(() => {
        exampleArticle = {
          article: {
            title: 'Some article',
            content: 'This article is very interesting mmmm yes.',
            authors: ['Mary S.', 'Mike M.'],
            created: 'May 10th 2020 11:00:15',
            lastUpdated: 'May 11th 2020 12:02:16',
            slidesTop: [
              'url/to/topSlide1',
              'url/to/topSlide2',
              'url/to/topSlide3'
            ],
            slidesBottom: [
              'url/to/botSlide1',
              'url/to/botSlide2',
              'url/to/bptSlide3'
            ],
            advertisementOne: '<a>First Ad</a>',
            advertisementTwo: '<a>Second Ad</a>',
            sidebar: {
              advertisementThree: '<a>Sidebar Ad</a>',
              related: {
                title: 'Title of some sidebar item'
              }
            },
            keywords: ['json', 'reshaping', 'in', 'action']
          }
        }
      })

      it('reshapes it as expected', async () => {
        let reshapeMap = new Map()

        // You can simply pass in the new path you want the existing data to move to
        reshapeMap.set(/\.keywords$/g, () => {
          return { path: 'meta.keywords' }
        })

        // Rename field in-place whilst using a negative lookback to avoid changing anything nested under "sidebar"
        reshapeMap.set(/(?<!sidebar.*)\.title$/g, (path) => {
          return { path: path.replace(/title/, 'name') }
        })

        reshapeMap.set(/\.content$/g, () => {
          return { path: 'article.body.main' }
        })

        // You can also alter the data as you move it to the new path
        reshapeMap.set(/\.authors$/g, (path, data) => {
          return {
            path: `article.header.author`,
            // Authors maybe only support one author in this old system you are backporting to
            data: data[0]
          }
        })

        reshapeMap.set(/\.lastUpdated$/g, () => {
          let newData = `May 11th 2020, 12:02:16 pm`
          return { path: 'article.body.footer.updated', data: newData }
        })
        // You can deal with merging different fields under one path with an onSet handler
        // The only variable passed in is the existing data at the new path provided
        // This also allows you to asyncronously transform the existing data before setting it
        // NOTE: If data AND onSet are specified on the return object then the return value from onSet will override data
        reshapeMap.set(/\.created$/g, (path, data) => {
          let newData = `May 10th 2020, 11:00:15 pm`
          return {
            path: 'article.body.footer',
            onSet: (existingData) => {
              existingData.created = newData
              return existingData
            }
          }
        })

        // Transform some more incoming data
        reshapeMap.set(/\.slidesTop$/g, (path, data) => {
          let slideshow = []
          for (let slide of data) {
            slideshow.push(`<img src="${slide}"></img><p>Cool slide</p>`)
          }

          return {
            path: `article.slideshows`,
            data: slideshow
          }
        })

        reshapeMap.set(/\.slidesBottom$/g, (path, data) => {
          let slideshow = []
          for (let slide of data) {
            slideshow.push(`<img src="${slide}"></img><p>Cool slide</p>`)
          }

          return {
            path: `article.slideshows`,
            // Transform the slides we set just earlier
            onSet: (existingData) => {
              return {
                top: existingData,
                bottom: slideshow
              }
            }
          }
        })

        // Match multiples even through just regular expressions
        reshapeMap.set(/\.advertisement(?:One|Two|Three)$/g, (path, data) => {
          return {
            path: 'article.ads',
            // Progressively build on target data path
            onSet: (existingData) => {
              existingData = existingData || []
              existingData.push(data)
              return existingData
            }
          }
        })

        // let start = process.hrtime()
        let result = await jsonREshape.reshapeAsync({ sourceObj: exampleArticle, map: reshapeMap })
        // let end = process.hrtime(start)
        // console.log(end[1] / 1000000, 'ms')

        // Assert the object was reshaped as expected
        expect(result).to.deep.equal({
          article: {
            ads: [
              '<a>First Ad</a>',
              '<a>Second Ad</a>',
              '<a>Sidebar Ad</a>'
            ],
            body: {
              footer: {
                created: 'May 10th 2020, 11:00:15 pm',
                updated: 'May 11th 2020, 12:02:16 pm'
              },
              main: 'This article is very interesting mmmm yes.'
            },
            header: {
              author: 'Mary S.'
            },
            sidebar: {
              related: {
                title: 'Title of some sidebar item'
              }
            },
            slideshows: {
              bottom: [
                '<img src=\"url/to/botSlide1\"></img><p>Cool slide</p>',
                '<img src=\"url/to/botSlide2\"></img><p>Cool slide</p>',
                '<img src=\"url/to/bptSlide3\"></img><p>Cool slide</p>'
              ],
              top: [
                '<img src=\"url/to/topSlide1\"></img><p>Cool slide</p>',
                '<img src=\"url/to/topSlide2\"></img><p>Cool slide</p>',
                '<img src=\"url/to/topSlide3\"></img><p>Cool slide</p>'
              ]
            },
            name: 'Some article',
          },
          meta: {
            keywords: [ 'json', 'reshaping', 'in', 'action' ]
          }
        })
      })
    })
  })

  describe('#reshapeAsync', () => {
    let exampleArticle
    beforeEach(() => {
      exampleArticle = {
        article: {
          title: 'Some article',
          content: 'This article is very interesting mmmm yes.',
          authors: ['Mary S.', 'Mike M.'],
          created: 'May 10th 2020 11:00:15',
          lastUpdated: 'May 11th 2020 12:02:16',
          slidesTop: [
            'url/to/topSlide1',
            'url/to/topSlide2',
            'url/to/topSlide3'
          ],
          slidesBottom: [
            'url/to/botSlide1',
            'url/to/botSlide2',
            'url/to/bptSlide3'
          ],
          advertisementOne: '<a>First Ad</a>',
          advertisementTwo: '<a>Second Ad</a>',
          sidebar: {
            advertisementThree: '<a>Sidebar Ad</a>',
            related: {
              title: 'Title of some sidebar item'
            }
          },
          keywords: ['json', 'reshaping', 'in', 'action']
        }
      }
    })

    context('when given a json object we need to reshape with a complex series of transforms', () => {
      it('reshapes it as expected', async () => {
        let reshapeMap = new Map()

        // You can simply pass in the new path you want the existing data to move to
        reshapeMap.set(/\.keywords$/g, () => {
          return { path: 'meta.keywords' }
        })

        // Rename field in-place whilst using a negative lookback to avoid changing anything nested under "sidebar"
        reshapeMap.set(/(?<!sidebar.*)\.title$/g, (path) => {
          return { path: path.replace(/title/, 'name') }
        })

        reshapeMap.set(/\.content$/g, () => {
          return { path: 'article.body.main' }
        })

        // You can also alter the data as you move it to the new path
        reshapeMap.set(/\.authors$/g, (path, data) => {
          return {
            path: `article.header.author`,
            // Authors maybe only support one author in this old system you are backporting to
            data: data[0]
          }
        })

        reshapeMap.set(/\.lastUpdated$/g, () => {
          let newData = `May 11th 2020, 12:02:16 pm`
          return { path: 'article.body.footer.updated', data: newData }
        })
        // You can deal with merging different fields under one path with an onSet handler
        // The only variable passed in is the existing data at the new path provided
        // This also allows you to asyncronously transform the existing data before setting it
        // NOTE: If data AND onSet are specified on the return object then the return value from onSet will override data
        reshapeMap.set(/\.created$/g, (path, data) => {
          let newData = `May 10th 2020, 11:00:15 pm`
          return {
            path: 'article.body.footer',
            onSet: (existingData) => {
              existingData.created = newData
              return existingData
            }
          }
        })

        // A very complex async example of transforming data from an existing path through some async operation and reshaping the results
        reshapeMap.set(/\.slidesTop$/g, async (path, data) => {
          let slideshow = []
          for (let slide of data) {
            let fetchedSlide = await new Promise((resolve) => {
              setTimeout(() => {
                resolve(`<img src="${slide}"></img><p>Cool slide</p>`)
              }, 50)
            })
            slideshow.push(fetchedSlide)
          }

          return {
            path: `article.slideshows`,
            data: slideshow
          }
        })
        // Asyncronously form data then asyncronously set it via onSet
        reshapeMap.set(/\.slidesBottom$/g, async (path, data) => {
          let slideshow = []
          for (let slide of data) {
            let fetchedSlide = await new Promise((resolve) => {
              setTimeout(() => {
                resolve(`<img src="${slide}"></img><p>Cool slide</p>`)
              }, 50)
            })
            slideshow.push(fetchedSlide)
          }

          return {
            path: `article.slideshows`,
            // Transform the slides we set just earlier
            onSet: async (existingData) => {
              let slideshow = []
              for (let slide of data) {
                let fetchedSlide = await new Promise((resolve) => {
                  setTimeout(() => {
                    resolve(`<img src="${slide}"></img><p>Cool slide</p>`)
                  }, 50)
                })
                slideshow.push(fetchedSlide)
              }

              return {
                top: existingData,
                bottom: slideshow
              }
            }
          }
        })

        // Match multiples even through just regular expressions
        reshapeMap.set(/\.advertisement(?:One|Two|Three)$/g, async (path, data) => {
          return {
            path: 'article.ads',
            onSet: (existingData) => {
              existingData = existingData || []
              existingData.push(data)
              return existingData
            }
          }
        })

        // let start = process.hrtime()
        let result = await jsonREshape.reshapeAsync({ sourceObj: exampleArticle, map: reshapeMap })
        // let end = process.hrtime(start)
        // console.log(end[1] / 1000000, 'ms')

        // Assert the object was reshaped as expected
        expect(result).to.deep.equal({
          article: {
            ads: [
              '<a>First Ad</a>',
              '<a>Second Ad</a>',
              '<a>Sidebar Ad</a>'
            ],
            body: {
              footer: {
                created: 'May 10th 2020, 11:00:15 pm',
                updated: 'May 11th 2020, 12:02:16 pm'
              },
              main: 'This article is very interesting mmmm yes.'
            },
            header: {
              author: 'Mary S.'
            },
            sidebar: {
              related: {
                title: 'Title of some sidebar item'
              }
            },
            slideshows: {
              bottom: [
                '<img src=\"url/to/botSlide1\"></img><p>Cool slide</p>',
                '<img src=\"url/to/botSlide2\"></img><p>Cool slide</p>',
                '<img src=\"url/to/bptSlide3\"></img><p>Cool slide</p>'
              ],
              top: [
                '<img src=\"url/to/topSlide1\"></img><p>Cool slide</p>',
                '<img src=\"url/to/topSlide2\"></img><p>Cool slide</p>',
                '<img src=\"url/to/topSlide3\"></img><p>Cool slide</p>'
              ]
            },
            name: 'Some article',
          },
          meta: {
            keywords: [ 'json', 'reshaping', 'in', 'action' ]
          }
        })
      })
    })

    context(`when you specify a path that matches nothing`, () => {
      context(`when strict option is toggled to false`, () => {
        it('ignores it', async () => {

          let reshapeMap = new Map()
          reshapeMap.set(/noDice/g, (path) => {
            return null
          })

          let reshaped = await jsonREshape.reshapeAsync({
            sourceObj: { x: 1 },
            map: reshapeMap,
            options: {
              strict: false
            }
          })

          expect(reshaped).to.deep.equal({ x: 1 })
        })
      })

      context(`when strict option is toggled to true`, () => {
        it('throws an error on no match found', async () => {

          let reshapeMap = new Map()
          reshapeMap.set(/noDice/g, (path) => {
            return null
          })

          let caught = false
          try {
            await jsonREshape.reshapeAsync({
              sourceObj: exampleArticle,
              map: reshapeMap,
              options: { strict: true }
            })
          } catch (e) {
            caught = true
            expect(e.message).to.contain('pattern /noDice/g did not match any path in the provided object')
          }
          if (!caught) throw new Error('invalid test')
        })
      })
    })
  })
})
