import { render, screen, fireEvent } from "@testing-library/react";
import AuthPanel from "../AuthPanel";

jest.mock("@/lib/api", () => ({
    login: jest.fn(),
    register: jest.fn(),
}));

import { login, register } from "@/lib/api";

describe("AuthPanel email validation", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("shows an error for an invalid email", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "abcdf@email.c" },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Please enter a valid email.")).toBeInTheDocument();
    });

    test("shows an error for an empty email input", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "" },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });

    test("shows an error for an email input with only spaces", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "    " },
        });
        fireEvent.blur(emailInput);

        expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });

    test("api is not called for invalid email and error is shown", () => {
        const { container } = render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");
        const passwordInput = screen.getByPlaceholderText("Password");
        const formElement = container.querySelector("form");

        expect(formElement).not.toBeNull();

        fireEvent.change(emailInput, {
            target: { value: "    " },
        });
        fireEvent.blur(emailInput);
        expect(screen.getByText("Email is required.")).toBeInTheDocument();

        fireEvent.change(passwordInput, {
            target: { value: "password123" },
        });

        fireEvent.submit(formElement!);
        expect(screen.getByText("Email is required.")).toBeInTheDocument();
        expect(login).not.toHaveBeenCalled();
    });

    test("email is trimmed and error is not shown for a valid email", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "example@example.com  " },
        });
        fireEvent.blur(emailInput);

        expect(screen.queryByText("Please enter a valid email.")).not.toBeInTheDocument();
    });

    test("valid trimmed email gets no error and login is successful", () => {
        const { container } = render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");
        const passwordInput = screen.getByPlaceholderText("Password");
        const formElement = container.querySelector("form");

        expect(formElement).not.toBeNull();

        fireEvent.change(emailInput, {
            target: { value: " example@example.com   " },
        });
        fireEvent.blur(emailInput);
        fireEvent.change(passwordInput, {
            target: { value: "password123" },
        });
        fireEvent.submit(formElement!);

        expect(login).toHaveBeenCalledWith({
            email: "example@example.com",
            password: "password123"
        });
    });

    test("does not show an error for a valid email", () => {
        render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");

        fireEvent.change(emailInput, {
            target: { value: "example@example.com" },
        });
        fireEvent.blur(emailInput);

        expect(screen.queryByText("Please enter a valid email.")).not.toBeInTheDocument();
    });

    test("login is successful for valid email", () => {
        const { container } = render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const emailInput = screen.getByPlaceholderText("Email");
        const passwordInput = screen.getByPlaceholderText("Password");
        const formElement = container.querySelector("form");

        expect(formElement).not.toBeNull();

        fireEvent.change(emailInput, {
            target: { value: "example@example.com" },
        });
        fireEvent.blur(emailInput);
        fireEvent.change(passwordInput, {
            target: { value: "password123" },
        });
        fireEvent.submit(formElement!);

        expect(login).toHaveBeenCalledWith({
            email: "example@example.com",
            password: "password123"
        });
    });

    test("registration fails for invalid email", () => {
        const { container } = render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const registerTab = screen.getByText("Register");
        fireEvent.click(registerTab);
        expect(registerTab).not.toBeNull();

        const nameInput = screen.getByPlaceholderText("Display name");
        const emailInput = screen.getByPlaceholderText("Email");
        const passwordInput = screen.getByPlaceholderText("Password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");
        const formElement = container.querySelector("form");

        expect(formElement).not.toBeNull();

        fireEvent.change(nameInput, {
            target: { value: "Test User name" },
        });
        fireEvent.change(emailInput, {
            target: { value: "example.com " },
        });
        fireEvent.blur(emailInput);
        fireEvent.change(passwordInput, {
            target: { value: "password123" },
        });
        fireEvent.change(confirmPasswordInput, {
            target: { value: "password123" },
        });
        fireEvent.submit(formElement!);

        expect(login).not.toHaveBeenCalled();
    });

    test("registration is successful for valid email", () => {
        const { container } = render(<AuthPanel auth={null} onSignIn={() => { }} onSignOut={() => { }} />);

        const registerTab = screen.getByText("Register");
        fireEvent.click(registerTab);
        expect(registerTab).not.toBeNull();

        const nameInput = screen.getByPlaceholderText("Display name");
        const emailInput = screen.getByPlaceholderText("Email");
        const passwordInput = screen.getByPlaceholderText("Password");
        const confirmPasswordInput = screen.getByPlaceholderText("Confirm password");
        const formElement = container.querySelector("form");

        expect(formElement).not.toBeNull();

        fireEvent.change(nameInput, {
            target: { value: "Test User name" },
        });
        fireEvent.change(emailInput, {
            target: { value: "example@example.com" },
        });
        fireEvent.blur(emailInput);
        fireEvent.change(passwordInput, {
            target: { value: "password123" },
        });
        fireEvent.change(confirmPasswordInput, {
            target: { value: "password123" },
        });
        fireEvent.submit(formElement!);

        expect(register).toHaveBeenCalledWith({
            displayName: "Test User name",
            email: "example@example.com",
            password: "password123",
        });
    });
});