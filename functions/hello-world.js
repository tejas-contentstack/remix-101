// functions/hello.js

export default function handler(request, response) {
    console.log('hey there');
    return response.status(200).json({message: "Hello world from cloud function!"});
  }