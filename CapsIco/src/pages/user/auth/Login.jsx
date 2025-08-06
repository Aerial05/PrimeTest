import React, { useState } from "react";
import { LoginForm } from "/src/components/user/auth/loginForm/LoginForm";
import { RegisterForm } from "/src/components/user/auth/registerForm/RegisterForm";
import { ForgetPasswordForm } from "/src/components/user/auth/forgetPasswordForm/ForgetPasswordForm";
import { VerifyCodeForm } from "/src/components/user/auth/verifyCodeForm/VerifyCodeForm";
import { ResetPasswordForm } from "/src/components/user/auth/resetPasswordForm/ResetPasswordForm";
import styles from "/src/pages/user/auth/Login.module.css";

import { CreativeSide } from "/src/components/user/auth/creativeSide/CreativeSide";


export function Login() {
  const [activeForm, setActiveForm] = useState("login");

  const renderForm = () => {
    switch (activeForm) {
      case "login":
        return <LoginForm onSwitch={setActiveForm} />;
      case "register":
        return <RegisterForm onSwitch={setActiveForm} />;
      case "forgot":
        return <ForgetPasswordForm onSwitch={setActiveForm} />;
      case "verify":
        return <VerifyCodeForm onSwitch={setActiveForm} />;
      case "reset":
        return <ResetPasswordForm onSwitch={setActiveForm} />;

      default:
        return <LoginForm onSwitch={setActiveForm} />;
    }
  };

  return (
    <div className={styles.splitContainer}>
      <div className={styles.authContainer}>{renderForm()}</div>
      <CreativeSide />
    </div>
  );
}
