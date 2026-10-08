package com.vmargin.banking.web;

import com.vmargin.banking.model.BankAccount;
import com.vmargin.banking.model.User;
import com.vmargin.banking.service.AccountService;
import com.vmargin.banking.service.CashInService;
import com.vmargin.banking.util.MoneyValidation;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

/** Owns the local cash-in form and its one-use review operation. */
@Controller
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class CashInController {
    static final String PENDING_ATTRIBUTE = "pendingCashIn";
    private static final long REVIEW_SECONDS = 300;

    private final CashInService cashInService;
    private final AccountService accountService;
    private final SessionAccounts accounts;
    private final CashInTokens tokens;

    public CashInController(CashInService cashInService, AccountService accountService,
                            SessionAccounts accounts, CashInTokens tokens) {
        this.cashInService = cashInService;
        this.accountService = accountService;
        this.accounts = accounts;
        this.tokens = tokens;
    }

    @GetMapping("/cash-in")
    public String cashInPage(HttpSession session, Model model) throws SQLException {
        User user = accounts.current(session);
        if (user == null) {
            return "redirect:/login";
        }
        model.addAttribute("user", user);
        try {
            model.addAttribute("eligibleAccounts", accountService.list(user).stream()
                .filter(CashInController::isEligible).toList());
            model.addAttribute("accountsAvailable", true);
        } catch (SQLException exception) {
            model.addAttribute("eligibleAccounts", List.of());
            model.addAttribute("accountsAvailable", false);
        }
        model.addAttribute("cashInToken", tokens.current(session, user).token());
        for (String key : List.of("cashInError", "cashInAmount", "cashInDetails")) {
            SessionFlash.takeValue(session, model, key, key);
        }
        SessionFlash.consumeActions(session, model);
        return "cash-in";
    }

    @PostMapping("/cash-in")
    public String startReview(@RequestParam String amount, @RequestParam String details,
                              @RequestParam(defaultValue = "0") long accountId,
                              @RequestParam(defaultValue = "") String token, HttpSession session) throws SQLException {
        User user = accounts.current(session);
        if (user == null) {
            return "redirect:/login";
        }
        CashInTokens.Token formToken = tokens.consume(session, user.getId(), token);
        if (formToken == null || formToken.ownerId() != user.getId() || !formToken.token().equals(token)
            || !formToken.expires().isAfter(Instant.now())) {
            rememberForm(session, amount, details,
                "This cash-in request expired or was already used. Start again.");
            return "redirect:/cash-in";
        }

        synchronized (session) {
            session.removeAttribute(PENDING_ATTRIBUTE);
            try {
                long destinationId = accountId < 1 ? user.getBankAccount().getId() : accountId;
                BankAccount destination = accountService.get(user, destinationId)
                    .filter(CashInController::isEligible)
                    .orElseThrow(() -> new IllegalArgumentException(
                        "Choose an active PHP account that belongs to you."));
                BigDecimal value = MoneyValidation.parse(amount);
                if (details == null || details.isBlank() || details.length() > 255) {
                    throw new IllegalArgumentException("Enter a description of up to 255 characters.");
                }
                PendingCashIn pending = new PendingCashIn(UUID.randomUUID().toString(), user.getId(),
                    destination.getId(), destination.getAccountName(), value, details, Instant.now()
                        .plusSeconds(REVIEW_SECONDS));
                session.setAttribute(PENDING_ATTRIBUTE, pending);
                session.setAttribute("cashInAmount", amount);
                session.setAttribute("cashInDetails", details);
                return "redirect:/cash-in/review";
            } catch (IllegalArgumentException exception) {
                rememberForm(session, amount, details, exception.getMessage());
            } catch (SQLException exception) {
                rememberForm(session, amount, details, "Cash-in review is temporarily unavailable. Try again.");
            }
        }
        return "redirect:/cash-in";
    }

    @GetMapping("/cash-in/review")
    public String review(HttpSession session, Model model) throws SQLException {
        User user = accounts.current(session);
        if (user == null) {
            return "redirect:/login";
        }
        PendingCashIn pending;
        synchronized (session) {
            pending = pending(session);
            if (!isActive(pending, user)) {
                if (pending != null && pending.ownerId() == user.getId()) {
                    session.removeAttribute(PENDING_ATTRIBUTE);
                }
                session.setAttribute("cashInError", "The cash-in review expired. Start again.");
                return "redirect:/cash-in";
            }
        }
        model.addAttribute("user", user);
        model.addAttribute("pendingCashIn", pending);
        model.addAttribute("operationToken", pending.token());
        return "cash-in-review";
    }

    @PostMapping("/cash-in/confirm")
    public String confirm(@RequestParam(defaultValue = "") String token, HttpSession session) throws SQLException {
        User user = accounts.current(session);
        if (user == null) {
            return "redirect:/login";
        }
        PendingCashIn pending;
        synchronized (session) {
            pending = pending(session);
            if (matches(pending, user, token)) {
                session.removeAttribute(PENDING_ATTRIBUTE);
            } else {
                pending = null;
            }
        }
        if (pending == null) {
            session.setAttribute("cashInError", "This cash-in review expired or was already used. Start again.");
            return "redirect:/cash-in";
        }
        try {
            cashInService.cashIn(user, pending.accountId(), pending.amount(), pending.details(), pending.token());
            session.removeAttribute("cashInAmount");
            session.removeAttribute("cashInDetails");
            session.removeAttribute("cashInError");
            return "redirect:/transactions/receipt/" + pending.token();
        } catch (SQLException | RuntimeException exception) {
            rememberForm(session, pending.amount().toPlainString(), pending.details(),
                "Cash-in could not be recorded. Check the amount and details and try again.");
            return "redirect:/cash-in";
        }
    }

    @PostMapping("/cash-in/cancel")
    public String cancel(@RequestParam(defaultValue = "") String token, HttpSession session) throws SQLException {
        User user = accounts.current(session);
        if (user == null) {
            return "redirect:/login";
        }
        synchronized (session) {
            PendingCashIn pending = pending(session);
            if (matches(pending, user, token)) {
                session.removeAttribute(PENDING_ATTRIBUTE);
                session.setAttribute("cashInAmount", pending.amount().toPlainString());
                session.setAttribute("cashInDetails", pending.details());
            }
        }
        return "redirect:/cash-in";
    }

    private PendingCashIn pending(HttpSession session) {
        Object value = session.getAttribute(PENDING_ATTRIBUTE);
        return value instanceof PendingCashIn cashIn ? cashIn : null;
    }

    private boolean isActive(PendingCashIn pending, User user) {
        return pending != null && pending.ownerId() == user.getId() && pending.expires().isAfter(Instant.now());
    }

    private boolean matches(PendingCashIn pending, User user, String token) {
        return isActive(pending, user) && pending.token().equals(token);
    }

    private static boolean isEligible(BankAccount account) {
        return "ACTIVE".equals(account.getStatus()) && "PHP".equals(account.getCurrencyCode());
    }

    private void rememberForm(HttpSession session, String amount, String details, String error) {
        session.setAttribute("cashInError", error);
        session.setAttribute("cashInAmount", amount);
        session.setAttribute("cashInDetails", details);
    }

    record PendingCashIn(String token, long ownerId, long accountId, String accountName,
                         BigDecimal amount, String details, Instant expires) {
    }
}
