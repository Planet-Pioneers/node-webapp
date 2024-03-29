# build and install package locally (use for development)
remotes::install_local("./", dependencies = TRUE, force = TRUE)

# Start service
library(openeocubes)

aws.host <- Sys.getenv("AWSHOST")
message("Starting openeocubes!")
if (aws.host == "") {
  aws.host <- NULL
} else {
  message("AWS host port id is: ", aws.host)
}


config <- SessionConfig(api.port = 8000, host = "0.0.0.0")
config$workspace.path = paste0(getwd(), "/test_workspace")
createSessionInstance(config)
Session$startSession()
