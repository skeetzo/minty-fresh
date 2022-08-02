const chai = require('chai')
const chaiHttp = require('chai-http')
const express = require('express')

const expect = chai.expect

chai.use(chaiHttp)

const createFakeServer = () => {
    const app = express()
    const apiPort = 30001
    const result = {
        message: 'Hello World',
        value: 3.5,
        odds: [1,3,5,7,9],
        person: {
            id: 123, 
            name: 'Sam Barros',
        }
    }

    app.get('/', (req, res) => {
        res.send(result)
    })

    app.listen(apiPort)

    return app
}

describe('API', () => {
	describe('GET /', () => {
      let fakeServer

      beforeEach(() => {
          fakeServer = createFakeServer()
      }) 

	  it('should return the object', (done) => {
          chai.request(fakeServer)
              .get("/")
              .end((err, res) => {
                  expect(err).to.be.null
                  expect(res).to.have.status(200)

                  expect(res.body).to.be.a('object')

                  expect(res.body).to.have.property('message')
                    
                  expect(res.body).to.have.property('value')
                  expect(res.body.value).to.be.a('number')

                  expect(res.body).to.have.property('odds')
                  expect(res.body.odds).to.be.a('array').with.lengthOf(5)
                  expect(res.body.odds).to.be.an('array').that.does.not.include(2)
                  expect(res.body.odds).to.deep.include(5)
                  expect(res.body.odds).to.have.ordered.members([1, 3, 5, 7, 9]).but.not.have.ordered.members([3, 1])

                  expect(res.body).to.have.property('person')
                  expect(res.body.person).to.have.property('id')
                  expect(res.body.person).to.have.property('name')
                  expect(res.body.person.name).to.be.string
                  expect(res.body.person.name).to.deep.equal('Sam Barros')

                  done()
              })
          })
	})
})