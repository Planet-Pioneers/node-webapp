module.exports = mongoose => {

  function isValidDate(date) {
    return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
  }
  const jobSchema = new mongoose.Schema({
    calculation:{
      type: String,
      enum: ["NDVI", "composite"],
      required: true
    },
    date: {
      type: String,
      required: true,
      validate: {
        validator: isValidDate,
        message: 'Invalid date format. It should be in the YYYY-MM-DD format.'
      }
    },
    coordinates: {
      type: [[Number]],
      required: true,
      validate: {
        validator: function (value) {
          // Check if coordinates array has at least two valid points
          return value.length == 4 && value.every(point => Array.isArray(point) && point.length === 2);
        },
        message: 'Invalid coordinates format. It should be an array with four points.'
      }
    },
    resolution:{
      type: Number,
      min: 10,
      max: 200,
      required: true
    }
  });


  jobSchema.method("toJSON", function () {
    const { __v, _id, ...object } = this.toObject();
    object.id = _id;
    return object;
  });

  const Job = mongoose.model("job", jobSchema);
  return Job;
};
