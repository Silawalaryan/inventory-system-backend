const verifyAdmin = (req,res,next)=>{
    if(req.user.role === "admin"){
     req.isAdmin = true;
    }else{
        req.isAdmin = false;
    }
    next();
}
export {verifyAdmin}